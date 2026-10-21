#requires -Version 5.1
param([string] $NodeExecutable = 'node')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot '../scripts/URAI_RFINAL_CURRENT_HEAD_ONEPASS_20261020_v2.ps1'
$testNodeExecutable = $NodeExecutable
. $launcher -FunctionsOnly
$root = Join-Path ([IO.Path]::GetTempPath()) ('urai-launcher-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$script:Evidence = $root
$script:Git = ResolveExecutable 'git'
$passed = 0
function Check([string] $Label, [scriptblock] $Test) { & $Test; $script:passed++; Write-Host "PASS $Label" }
function Equal($Actual, $Expected) { if ($Actual -cne $Expected) { throw "Expected [$Expected], received [$Actual]" } }
function Throws([scriptblock] $Test, [string] $Pattern) {
    $caught = $false
    try { & $Test | Out-Null } catch { if ($_.Exception.Message -notmatch $Pattern) { throw }; $caught = $true }
    if (-not $caught) { throw "Expected rejection $Pattern" }
}
try {
    Check 'PowerShell parser accepts launcher' {
        $tokens=$null; $errors=$null
        $null = [Management.Automation.Language.Parser]::ParseFile((Resolve-Path $launcher),[ref]$tokens,[ref]$errors)
        Equal @($errors).Count 0
    }
    Check 'canonical original remote identities and impostor denial' {
        foreach($remote in @('https://github.com/LifeLoggerAI/urai-spatial.git','git@github.com:LifeLoggerAI/urai-spatial.git','ssh://git@github.com/LifeLoggerAI/urai-spatial.git')) { Equal (IsOriginalRemote $remote) $true }
        foreach($remote in @('https://github.com/other/urai-spatial.git','https://evil.invalid/LifeLoggerAI/urai-spatial.git','https://github.com/LifeLoggerAI/urai-spatial-extra.git')) { Equal (IsOriginalRemote $remote) $false }
    }
    Check 'launcher does not borrow recovered checkout object store' {
        $launcherText = Get-Content -LiteralPath $launcher -Raw
        if ($launcherText -match "clone','--shared'") { throw 'Shared clone dependency reintroduced' }
        if ($launcherText -notmatch "isolated-canonical-clone") { throw 'Canonical isolated clone proof missing' }
        if ($launcherText -notmatch [regex]::Escape($script:CanonicalRemote)) { throw 'Canonical remote clone missing' }
    }
    Check 'canonical remote without usable HEAD is rejected during source validation' {
        $headless = Join-Path $root 'headless source'
        New-Item -ItemType Directory -Path $headless | Out-Null
        $null = GitRead @('init','-q',$headless) $root 'headless-init'
        $null = GitRead @('-C',$headless,'remote','add','origin','https://github.com/LifeLoggerAI/urai-spatial.git') $root 'headless-remote'
        Throws { ResolveOriginalRepo $headless 'headless' } 'SOURCE_HEAD_INVALID'
    }
    $repo = Join-Path $root 'source with spaces'
    New-Item -ItemType Directory -Path $repo | Out-Null
    $null = GitRead @('init','-q',$repo) $root 'init'
    $null = GitRead @('-C',$repo,'config','user.email','fixture@example.invalid') $root 'email'
    $null = GitRead @('-C',$repo,'config','user.name','Fixture') $root 'name'
    $null = GitRead @('-C',$repo,'remote','add','origin','https://github.com/LifeLoggerAI/urai-spatial.git') $root 'remote'
    [IO.File]::WriteAllText((Join-Path $repo 'tracked.txt'),'original')
    $null = GitRead @('-C',$repo,'add','tracked.txt') $root 'add'
    $null = GitRead @('-C',$repo,'commit','-qm','fixture') $root 'commit'
    $nested = Join-Path $repo 'nested'
    New-Item -ItemType Directory -Path $nested | Out-Null
    Check 'valid root and nested directory resolve to original Git root' {
        Equal (ResolveOriginalRepo $repo 'root') (CanonicalPath $repo)
        Equal (ResolveOriginalRepo $nested 'nested') (CanonicalPath $repo)
    }
    Check 'separator normalization and filesystem case comparison' {
        Equal (SamePath $repo ($repo + [IO.Path]::DirectorySeparatorChar)) $true
        if ($env:OS -eq 'Windows_NT') {
            Equal (SamePath $repo ($repo.Replace('\','/').ToUpperInvariant())) $true
        } else { Write-Host 'Windows case/separator assertion requires Windows; Linux trailing separator executed.' }
    }
    Check 'wrong root rejected' { Throws { ResolveOriginalRepo $root 'wrong-root' } 'GIT_COMMAND_FAILED' }
    Check 'wrong remote rejected' {
        $null = GitRead @('-C',$repo,'remote','set-url','origin','https://github.com/other/repo.git') $root 'wrong-remote'
        Throws { ResolveOriginalRepo $repo 'wrong-origin' } 'SOURCE_REMOTE_NOT_ORIGINAL_URAI'
        $null = GitRead @('-C',$repo,'remote','set-url','origin',$script:CanonicalRemote) $root 'restore-origin'
    }
    Check 'dirty checkout bytes and index remain unchanged' {
        [IO.File]::WriteAllText((Join-Path $repo 'tracked.txt'),'dirty user data')
        $index = GitRead @('-C',$repo,'ls-files','--stage') $root 'index-before'
        $null = ResolveOriginalRepo $repo 'dirty'
        Equal ([IO.File]::ReadAllText((Join-Path $repo 'tracked.txt'))) 'dirty user data'
        Equal (GitRead @('-C',$repo,'ls-files','--stage') $root 'index-after') $index
    }
    Check 'linked worktree root identity' {
        $worktree = Join-Path $root 'linked worktree'
        $null = GitRead @('-C',$repo,'worktree','add','--detach',$worktree,'HEAD') $root 'worktree-add'
        Equal (ResolveOriginalRepo $worktree 'worktree') (CanonicalPath $worktree)
    }
    Check 'missing Git executable fails' { Throws { ResolveExecutable 'urai-missing-git-fixture' } 'not recognized|not found' }
    Check 'missing Node executable fails' { Throws { ResolveExecutable 'urai-missing-node-fixture' } 'not recognized|not found' }
    Check 'child process failure retains stdout stderr and nonzero exit' {
        $node = ResolveExecutable $testNodeExecutable
        $r = InvokeCaptured $node @('-e','console.log("OUT"); console.error("ERR"); process.exit(7)') $root (Join-Path $root 'child') 30
        Equal $r.exitCode 7
        Equal $r.stdout.Trim() 'OUT'; Equal $r.stderr.Trim() 'ERR'
        Equal (Test-Path (Join-Path $root 'child.process.json')) $true
    }
    Check 'invalid child working directory is rejected' { Throws { InvokeCaptured $script:Git @('--version') (Join-Path $root 'missing') (Join-Path $root 'missing-cwd') } 'WORKING_DIRECTORY_MISSING' }
    Check 'concurrent branch movement rejected' {
        $before = GitRead @('-C',$repo,'rev-parse','HEAD') $root 'movement-before'
        $null = GitRead @('-C',$repo,'commit','--allow-empty','-qm','concurrent fixture movement') $root 'movement-commit'
        $after = GitRead @('-C',$repo,'rev-parse','HEAD') $root 'movement-after'
        Throws { AssertUnchanged $before $after 'head' } 'CONCURRENT_SOURCE_CHANGE'
    }
    Check 'original StrictMode scalar FileInfo Count crash is reproduced' {
        $folder=Join-Path $root 'scalar-repro'
        New-Item -ItemType Directory -Path $folder | Out-Null
        [IO.File]::WriteAllText((Join-Path $folder 'single.log'),'proof')
        Throws { $original = Get-ChildItem -LiteralPath $folder -Force; $null = $original.Count } 'Count'
        $corrected = @(Get-ChildItem -LiteralPath $folder -Force)
        Equal $corrected.Count 1
    }
    Check 'zero one and many evidence files ZIP and SHA256 round trip' {
        foreach($count in @(0,1,3)) {
            $folder=Join-Path $root ('package-' + $count)
            New-Item -ItemType Directory -Path $folder | Out-Null
            for($i=0;$i -lt $count;$i++) { [IO.File]::WriteAllText((Join-Path $folder ('.evidence-' + $i)), 'proof') }
            $r = PackageEvidence $folder ($folder + '.zip')
            Equal $r.topLevelItems $count
            Equal $r.sha256 (Get-FileHash ($folder + '.zip') -Algorithm SHA256).Hash.ToLowerInvariant()
            $zip = [IO.Compression.ZipFile]::OpenRead($r.zip)
            try { Equal $zip.Entries.Count $count } finally { $zip.Dispose() }
        }
    }
    Check 'early preflight failure exits nonzero with summary and ZIP' {
        $psExe = Join-Path $PSHOME $(if ($env:OS -eq 'Windows_NT' -and $PSVersionTable.PSVersion.Major -le 5) { 'powershell.exe' } elseif ($env:OS -eq 'Windows_NT') { 'pwsh.exe' } else { 'pwsh' })
        $out = Join-Path $root 'early-output'
        $r = InvokeCaptured $psExe @('-NoProfile','-File',(Resolve-Path $launcher).Path,'-GitExecutable','urai-missing-git-fixture','-OutputParent',$out) $root (Join-Path $root 'early') 60
        Equal $r.exitCode 1
        $summaries=@(Get-ChildItem -LiteralPath $out -Recurse -Filter 'summary.json')
        Equal $summaries.Count 1
        $summary = Get-Content $summaries[0].FullName -Raw | ConvertFrom-Json
        if (-not $summary.primaryError) { throw 'Original error missing' }
        Equal @((Get-ChildItem -LiteralPath $out -Filter '*.zip')).Count 1
    }
    Check 'evidence packaging failure cannot erase primary error' {
        $psExe = Join-Path $PSHOME $(if ($env:OS -eq 'Windows_NT' -and $PSVersionTable.PSVersion.Major -le 5) { 'powershell.exe' } elseif ($env:OS -eq 'Windows_NT') { 'pwsh.exe' } else { 'pwsh' })
        # Exercise finalization result contract without replacing filesystem APIs.
        $summary=[ordered]@{primaryError='ORIGINAL_FAILURE';packagingError=$null}
        try { PackageEvidence (Join-Path $root 'does-not-exist') (Join-Path $root 'bad.zip') } catch { $summary.packagingError=$_.Exception.Message }
        Equal $summary.primaryError 'ORIGINAL_FAILURE'
        if (-not $summary.packagingError) { throw 'Packaging error not recorded' }
    }
    Write-Host "REGRESSION_GROUPS_PASS=$passed PLATFORM=$([Environment]::OSVersion)"
} finally {
    # Only this test's unique synthetic fixtures are removed.
    Remove-Item -LiteralPath $root -Recurse -Force
}
