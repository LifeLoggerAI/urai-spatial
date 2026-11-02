#requires -Version 5.1
[CmdletBinding()]
param(
    [string] $ExistingRepo,
    [string] $GitExecutable = 'git',
    [string] $NodeExecutable,
    [string] $OutputParent = (Join-Path $HOME 'Downloads'),
    [string] $ExpectedAncestor = 'e589b8b0e2c45d4f67cd3e14df377e0fca4c7687',
    [switch] $FunctionsOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:CanonicalRemote = 'https://github.com/LifeLoggerAI/urai-spatial.git'
$script:IntegrationBranch = 'repair/rfinal-convergence-candidate-20261020'

function CanonicalPath([string] $Value) {
    $resolved = (Resolve-Path -LiteralPath $Value -ErrorAction Stop).ProviderPath
    $full = [IO.Path]::GetFullPath($resolved)
    if ($env:OS -eq 'Windows_NT') { $full = $full.Replace('/', '\') }
    return $full.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
}
function SamePath([string] $Left, [string] $Right) {
    $comparison = [StringComparison]::Ordinal
    if ($env:OS -eq 'Windows_NT') { $comparison = [StringComparison]::OrdinalIgnoreCase }
    return [string]::Equals((CanonicalPath $Left), (CanonicalPath $Right), $comparison)
}
function IsOriginalRemote([string] $Remote) {
    return $Remote -match '^(?i)(?:https://github\.com/|ssh://git@github\.com/|git@github\.com:)LifeLoggerAI/urai-spatial(?:\.git)?/?$'
}
function ResolveExecutable([string] $Name) {
    $cmd = Get-Command -Name $Name -CommandType Application -ErrorAction Stop | Select-Object -First 1
    return $cmd.Source
}
function ResolveNode22([string] $Requested, [string] $Cwd) {
    $candidates = @()
    if ($Requested) { $candidates = @(ResolveExecutable $Requested) }
    else {
        try { $candidates += ResolveExecutable 'node' } catch { }
        # Bounded portable-toolchain discovery only. Never inspect personal media.
        $downloads = Join-Path $HOME 'Downloads'
        if (Test-Path -LiteralPath $downloads -PathType Container) {
            $dirs = @(Get-ChildItem -LiteralPath $downloads -Directory -Filter '*Node*' -ErrorAction SilentlyContinue | Sort-Object FullName)
            foreach ($dir in $dirs) {
                $candidates += Join-Path $dir.FullName 'node.exe'
                foreach ($child in @(Get-ChildItem -LiteralPath $dir.FullName -Directory -ErrorAction SilentlyContinue | Sort-Object FullName)) {
                    $candidates += Join-Path $child.FullName 'node.exe'
                }
            }
        }
    }
    $ordinal = 0
    foreach ($candidate in @($candidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $ordinal++
        $r = InvokeCaptured $candidate @('--version') $Cwd (Join-Path $script:Evidence ('node-candidate-' + $ordinal)) 30
        if ($r.exitCode -eq 0 -and $r.stdout.Trim() -match '^v22\.') { return $candidate }
    }
    throw 'NODE_22_REQUIRED: supply -NodeExecutable with the verified portable node.exe'
}
function QuoteNative([string] $Value) {
    # CommandLineToArgvW-compatible quoting for .NET Framework / PS 5.1.
    return '"' + [regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
function InvokeCaptured {
    param([string] $Exe, [string[]] $Argv, [string] $Cwd, [string] $Prefix, [int] $TimeoutSeconds = 7200)
    if (-not (Test-Path -LiteralPath $Cwd -PathType Container)) { throw "WORKING_DIRECTORY_MISSING: $Cwd" }
    $stdout = $null; $stderr = $null
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Exe
    $info.Arguments = (($Argv | ForEach-Object { QuoteNative $_ }) -join ' ')
    $info.WorkingDirectory = $Cwd
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
    $info.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
    $info.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'
    $info.EnvironmentVariables['GIT_OPTIONAL_LOCKS'] = '0'
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    $started = Get-Date
    try {
        if (-not $process.Start()) { throw 'PROCESS_DID_NOT_START' }
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $process.Kill()
            $process.WaitForExit()
            throw "CHILD_TIMEOUT: $Exe"
        }
        $code = $process.ExitCode
        $outText = $stdout.GetAwaiter().GetResult()
        $errText = $stderr.GetAwaiter().GetResult()
        WriteJson ($Prefix + '.process.json') ([ordered]@{exitCode=$code; startedAt=$started.ToUniversalTime().ToString('o'); finishedAt=(Get-Date).ToUniversalTime().ToString('o')})
        return [pscustomobject]@{ exitCode=$code; stdout=$outText; stderr=$errText; startedAt=$started.ToUniversalTime().ToString('o') }
    } finally {
        try {
            if ($null -ne $stdout) { [IO.File]::WriteAllText($Prefix + '.stdout.log', $stdout.GetAwaiter().GetResult()) }
            if ($null -ne $stderr) { [IO.File]::WriteAllText($Prefix + '.stderr.log', $stderr.GetAwaiter().GetResult()) }
        } catch { Write-Warning "CHILD_LOG_WRITE_FAILED: $_" }
        $process.Dispose()
    }
}
function GitRead([string[]] $Argv, [string] $Cwd, [string] $Label) {
    $r = InvokeCaptured $script:Git $Argv $Cwd (Join-Path $script:Evidence $Label) 600
    if ($r.exitCode -ne 0) { throw "GIT_COMMAND_FAILED: $Label exit=$($r.exitCode)" }
    return $r.stdout.Trim()
}
function ResolveOriginalRepo([string] $Candidate, [string] $Label) {
    if (-not (Test-Path -LiteralPath $Candidate -PathType Container)) { throw 'SOURCE_DIRECTORY_MISSING' }
    # Git resolves nested paths and linked-worktree .git files to the actual root.
    $root = GitRead @('-C', $Candidate, 'rev-parse', '--show-toplevel') $Candidate ($Label + '-root')
    $root = CanonicalPath $root
    $verified = GitRead @('-C', $root, 'rev-parse', '--show-toplevel') $root ($Label + '-root-check')
    if (-not (SamePath $root $verified)) { throw 'SOURCE_NOT_THE_EXPECTED_GIT_ROOT' }
    $origin = GitRead @('-C', $root, 'remote', 'get-url', 'origin') $root ($Label + '-origin')
    if (-not (IsOriginalRemote $origin)) { throw 'SOURCE_REMOTE_NOT_ORIGINAL_URAI' }
    # A repository can still expose the canonical remote and contain known commit
    # objects while having no usable HEAD (for example an interrupted recovery).
    # Reject it during discovery/explicit validation instead of selecting it and
    # failing later at original-head-before.
    $headCheck = InvokeCaptured $script:Git @('-C',$root,'rev-parse','--verify','HEAD^{commit}') $root (Join-Path $script:Evidence ($Label + '-head-check')) 60
    if ($headCheck.exitCode -ne 0) { throw 'SOURCE_HEAD_INVALID' }
    $statusCheck = InvokeCaptured $script:Git @('-C',$root,'status','--porcelain=v1','--untracked-files=no') $root (Join-Path $script:Evidence ($Label + '-status-check')) 60
    if ($statusCheck.exitCode -ne 0) { throw 'SOURCE_STATUS_UNREADABLE' }
    return $root
}
function DiscoverOriginalRepo {
    $candidates = @()
    foreach ($base in @($HOME, (Join-Path $HOME 'Downloads'))) {
        if (-not (Test-Path -LiteralPath $base -PathType Container)) { continue }
        foreach ($dir in @(Get-ChildItem -LiteralPath $base -Directory -Filter '*UrAi*' -ErrorAction SilentlyContinue | Sort-Object FullName)) {
            $candidates += $dir.FullName
            $nested = Join-Path $dir.FullName 'source'
            if (Test-Path -LiteralPath $nested -PathType Container) { $candidates += $nested }
        }
    }
    $valid = @(); $ordinal = 0
    foreach ($candidate in @($candidates | Sort-Object -Unique)) {
        $ordinal++
        try {
            $root = ResolveOriginalRepo $candidate ('discover-' + $ordinal)
            $knownObject = $false
            foreach ($anchorSha in @($ExpectedAncestor,'45111ecc205080926e6b879c94d3fd492eca8260','f904e48a3c5688576db12dc2fdf8477eb7fe0b24')) {
                $anchor = InvokeCaptured $script:Git @('-C',$root,'cat-file','-e',($anchorSha + '^{commit}')) $root (Join-Path $script:Evidence ('discover-anchor-' + $ordinal + '-' + $anchorSha)) 60
                if ($anchor.exitCode -eq 0) { $knownObject = $true; break }
            }
            if ($knownObject -and -not ($valid -contains $root)) { $valid += $root }
        } catch { }
    }
    if ($valid.Count -eq 0) { throw 'NO_VERIFIED_ORIGINAL_CHECKOUT: supply -ExistingRepo' }
    # Every candidate has canonical origin AND the original known commit object.
    # Select deterministically; no source checkout/index is ever mutated.
    return @($valid | Sort-Object)[0]
}
function WriteJson([string] $File, $Value) {
    [IO.File]::WriteAllText($File, ($Value | ConvertTo-Json -Depth 30), (New-Object Text.UTF8Encoding($false)))
}
function PackageEvidence([string] $Directory, [string] $Zip) {
    $archiveContents = @(Get-ChildItem -LiteralPath $Directory -Force)
    # Empty evidence is valid packaging input; summary is written before this call.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($Directory, $Zip, [IO.Compression.CompressionLevel]::Optimal, $false)
    $digest = (Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText($Zip + '.sha256', ($digest + '  ' + [IO.Path]::GetFileName($Zip) + "`n"))
    return [pscustomobject]@{ zip=$Zip; sha256=$digest; topLevelItems=$archiveContents.Count }
}
function AssertUnchanged([string] $Before, [string] $After, [string] $Label) {
    if ($Before -cne $After) { throw "CONCURRENT_SOURCE_CHANGE: $Label" }
}
if ($FunctionsOnly) { return }
$stdout = $null; $stderr = $null
$script:Evidence = $null
$summary = [ordered]@{ schema='URAI_CURRENT_HEAD_LAUNCHER_V2'; startedAt=(Get-Date).ToUniversalTime().ToString('o'); authority='NO_DEPLOY_NO_MERGE_NO_BILLING_NO_PRIVATE_MEDIA'; originalRepo=$null; head=$null; tree=$null; runnerBlob=$null; nativeExitCode=$null; primaryError=$null; packagingError=$null; result='NO_GO'; validationPlatform=[Environment]::OSVersion.ToString() }
$exitCode = 1
try {
    New-Item -ItemType Directory -Path $OutputParent -Force | Out-Null
    $run = Join-Path $OutputParent ('URAI_RFINAL_V2_' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Path $run | Out-Null
    $script:Evidence = Join-Path $run 'launcher-evidence'
    New-Item -ItemType Directory -Path $script:Evidence | Out-Null
    WriteJson (Join-Path $script:Evidence 'summary.json') $summary
    $script:Git = ResolveExecutable $GitExecutable
    $node = ResolveNode22 $NodeExecutable $run
    $version = InvokeCaptured $node @('--version') $run (Join-Path $script:Evidence 'node-version') 30
    if ($version.exitCode -ne 0 -or $version.stdout.Trim() -notmatch '^v22\.') { throw 'NODE_22_REQUIRED: use -NodeExecutable with your verified portable node.exe' }
    if ($env:OS -ne 'Windows_NT') { throw 'WINDOWS_NATIVE_EXECUTION_REQUIRED' }
    if ($ExpectedAncestor -notmatch '^[0-9a-f]{40}$') { throw 'INVALID_EXPECTED_ANCESTOR' }
    $repo = if ($ExistingRepo) { ResolveOriginalRepo $ExistingRepo 'explicit' } else { DiscoverOriginalRepo }
    $summary.originalRepo = $repo
    $beforeHead = GitRead @('-C',$repo,'rev-parse','HEAD') $repo 'original-head-before'
    $beforeStatus = GitRead @('-C',$repo,'status','--porcelain=v1','--untracked-files=no') $repo 'original-status-before'
    $source = Join-Path $run 'source'
    # The recovered founder checkout may be readable enough to prove identity
    # while still containing missing/corrupt Git objects. Never borrow its object
    # store for release evidence. Resolve the live branch first, then create a
    # completely independent no-checkout clone from canonical GitHub.
    $remote = GitRead @('ls-remote','--heads',$script:CanonicalRemote,('refs/heads/' + $script:IntegrationBranch)) $run 'live-head'
    $match = [regex]::Match($remote, ('^([0-9a-f]{40})\s+refs/heads/' + [regex]::Escape($script:IntegrationBranch) + '$'))
    if (-not $match.Success) { throw 'REMOTE_REF_INVALID' }
    $head = $match.Groups[1].Value
    $summary.head = $head
    $null = GitRead @('-c','core.autocrlf=false','-c','core.longpaths=true','clone','--no-checkout','--single-branch','--branch',$script:IntegrationBranch,'--',$script:CanonicalRemote,$source) $run 'isolated-canonical-clone'
    $clonedHead = GitRead @('-C',$source,'rev-parse',('refs/remotes/origin/' + $script:IntegrationBranch)) $source 'isolated-cloned-head'
    AssertUnchanged $head $clonedHead 'canonical branch during isolated clone'
    $null = GitRead @('-C',$source,'merge-base','--is-ancestor',$ExpectedAncestor,$head) $source 'expected-ancestry'
    $summary.tree = GitRead @('-C',$source,'rev-parse',($head + '^{tree}')) $source 'tree'
    # Mirror the exact runner and every local module it imports before checkout.
    # The audit helper must not import a detached copy with missing siblings.
    $auditMirror = Join-Path $script:Evidence 'audit-mirror'
    New-Item -ItemType Directory -Path (Join-Path $auditMirror 'scripts') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $auditMirror 'tests') -Force | Out-Null
    $auditFiles = @(
        'scripts/run-rfinal-native-evidence.mjs',
        'scripts/rfinal-source-authority.mjs',
        'scripts/visual-png-integrity.mjs',
        'scripts/rfinal-visual-evidence-paths.mjs',
        'scripts/rfinal-missing-tracked-repair.mjs',
        'tests/spatial-owned-server.mjs'
    )
    $ordinal = 0
    foreach ($auditFile in $auditFiles) {
        $ordinal++
        $expectedBlob = GitRead @('-C',$source,'rev-parse',($head + ':' + $auditFile)) $source ('audit-import-blob-' + $ordinal)
        if ($auditFile -eq 'scripts/run-rfinal-native-evidence.mjs') { $summary.runnerBlob = $expectedBlob }
        $null = GitRead @('-C',$source,'show',($head + ':' + $auditFile)) $source ('audit-import-show-' + $ordinal)
        $destination = Join-Path $auditMirror ($auditFile.Replace('/', [IO.Path]::DirectorySeparatorChar))
        Copy-Item -LiteralPath (Join-Path $script:Evidence ('audit-import-show-' + $ordinal + '.stdout.log')) -Destination $destination
        $diskBlob = GitRead @('-C',$source,'hash-object','--no-filters',$destination) $source ('audit-import-hash-' + $ordinal)
        if ($diskBlob -ne $expectedBlob) { throw ('AUDIT_IMPORT_BLOB_MISMATCH: ' + $auditFile) }
    }
    # Import only the exact maintained runner's reviewed sparse rules and tree audit,
    # with its exact local dependency graph mirrored beside it.
    $auditHelper = Join-Path $script:Evidence 'audit-tree.mjs'
    [IO.File]::WriteAllText($auditHelper, @'
import {readFileSync,writeFileSync} from 'node:fs';
import {auditWindowsSparsePaths,WINDOWS_SAFE_SPARSE_PATTERNS,PINNED_FILES} from './audit-mirror/scripts/run-rfinal-native-evidence.mjs';
const raw=readFileSync(process.argv[2],'utf8');
if(!raw.endsWith('\0')) throw Error('INCOMPLETE_GIT_TREE');
const entries=raw.slice(0,-1).split('\0');
const audit=auditWindowsSparsePaths(entries);
const missing=PINNED_FILES.filter(p=>!entries.includes(p));
writeFileSync(process.argv[3],JSON.stringify({...audit,missing},null,2));
if(audit.unexpected.length||audit.collisions.length||missing.length) process.exit(1);
writeFileSync(process.argv[4],WINDOWS_SAFE_SPARSE_PATTERNS.join('\n')+'\n');
'@)
    # Process capture is text-safe for NUL-separated UTF-8 Git paths.
    $paths = GitRead @('-C',$source,'ls-tree','-rz','--name-only',$head) $source 'tracked-paths'
    $treeList = Join-Path $script:Evidence 'tracked-paths.bin'
    Copy-Item -LiteralPath (Join-Path $script:Evidence 'tracked-paths.stdout.log') -Destination $treeList
    $patterns = Join-Path $script:Evidence 'sparse-patterns'
    $audit = InvokeCaptured $node @($auditHelper,$treeList,(Join-Path $script:Evidence 'tree-audit.json'),$patterns) $run (Join-Path $script:Evidence 'tree-audit') 90
    if ($audit.exitCode -ne 0) { throw 'WINDOWS_SPARSE_TREE_AUDIT_FAILED' }
    $sparseArgs = @('-C',$source,'sparse-checkout','set','--no-cone') + @(Get-Content -LiteralPath $patterns)
    $null = GitRead $sparseArgs $source 'sparse-checkout'
    $null = GitRead @('-C',$source,'-c','core.protectNTFS=false','-c','core.autocrlf=false','-c','core.longpaths=true','checkout','--detach',$head) $source 'exact-checkout'
    AssertUnchanged $head (GitRead @('-C',$source,'rev-parse','HEAD') $source 'isolated-head-check') 'isolated HEAD'
    $package = Get-Content -LiteralPath (Join-Path $source 'package.json') -Raw | ConvertFrom-Json
    if ($package.packageManager -ne 'pnpm@10.0.0') { throw 'UNREVIEWED_PNPM_PIN' }
    $remoteAgain = GitRead @('ls-remote','--heads',$script:CanonicalRemote,('refs/heads/' + $script:IntegrationBranch)) $run 'live-head-second'
    AssertUnchanged $remote $remoteAgain 'integration branch'
    AssertUnchanged $beforeHead (GitRead @('-C',$repo,'rev-parse','HEAD') $repo 'original-head-pre-run') 'original HEAD'
    AssertUnchanged $beforeStatus (GitRead @('-C',$repo,'status','--porcelain=v1','--untracked-files=no') $repo 'original-status-pre-run') 'original tracked status'
    $selftest = InvokeCaptured $node @((Join-Path $source 'scripts/run-rfinal-native-evidence.mjs'),'--selftest') $source (Join-Path $script:Evidence 'runner-selftest') 90
    if ($selftest.exitCode -ne 0) { throw 'ORIGINAL_RUNNER_SELFTEST_FAILED' }
    $nativeEvidence = Join-Path $script:Evidence 'native'
    Write-Host "EXACT_HEAD=$head TREE=$($summary.tree)"
    Write-Host "Executing original native matrix. Logs: $script:Evidence"
    $result = InvokeCaptured $node @((Join-Path $source 'scripts/run-rfinal-native-evidence.mjs'),'--source',$source,'--evidence-dir',$nativeEvidence) $source (Join-Path $script:Evidence 'native-runner') 43200
    $summary.nativeExitCode = $result.exitCode
    AssertUnchanged $beforeHead (GitRead @('-C',$repo,'rev-parse','HEAD') $repo 'original-head-post-run') 'original HEAD after tests'
    AssertUnchanged $beforeStatus (GitRead @('-C',$repo,'status','--porcelain=v1','--untracked-files=no') $repo 'original-status-post-run') 'original tracked status after tests'
    $finalRemote = GitRead @('ls-remote','--heads',$script:CanonicalRemote,('refs/heads/' + $script:IntegrationBranch)) $run 'live-head-final'
    AssertUnchanged $remote $finalRemote 'integration branch after tests; exact older evidence retained'
    $receipt = Get-Content -LiteralPath (Join-Path $nativeEvidence 'execution-receipt.json') -Raw | ConvertFrom-Json
    if ($receipt.gitHead -ne $head -or $receipt.tree -ne $summary.tree) { throw 'NATIVE_RECEIPT_IDENTITY_MISMATCH' }
    if ($result.exitCode -ne 0 -or -not $receipt.fullCurrentHeadGreen) { throw "NATIVE_MATRIX_FAILED_OR_INCOMPLETE: exit=$($result.exitCode)" }
    $summary.result = 'NATIVE_MATRIX_GREEN_NOT_RELEASE_APPROVAL'
    $exitCode = 0
} catch {
    $summary.primaryError = $_.Exception.ToString()
    Write-Warning $summary.primaryError
} finally {
    $summary.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
    if ($script:Evidence) {
        try { WriteJson (Join-Path $script:Evidence 'summary.json') $summary } catch { Write-Warning "SUMMARY_WRITE_FAILED: $_" }
        try {
            $packageResult = PackageEvidence $script:Evidence ($run + '.zip')
            Write-Host "EVIDENCE_ZIP=$($packageResult.zip)"
            Write-Host "SHA256=$($packageResult.sha256)"
        } catch {
            $summary.packagingError = $_.Exception.ToString()
            $exitCode = 1
            try { WriteJson (Join-Path $script:Evidence 'summary.json') $summary } catch { }
            Write-Warning "EVIDENCE_PACKAGING_FAILED; unarchived evidence retained: $script:Evidence"
        }
    }
    Write-Host "RESULT=$($summary.result)"
}
exit $exitCode
