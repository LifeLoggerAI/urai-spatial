# Run from any PowerShell window. Creates an isolated, source-pinned UrAi worktree.
# Does not checkout, delete, merge, or modify the founder's existing worktrees.
[CmdletBinding()]
param(
 [ValidateRange(1024,65535)][int]$Port=3107,
 [string]$Destination=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$branch='visual/home-cc0-photographic-review-proof-20261022'
$gitRef='refs/heads/' + $branch
$remote='refs/remotes/origin/' + $branch
if((node -v) -notmatch '^v22\.') { throw 'NODE22_REQUIRED' }
$repoUrl=(& git -C $root remote get-url origin).Trim()
if($LASTEXITCODE -ne 0 -or $repoUrl -notin @('https://github.com/LifeLoggerAI/urai-spatial.git','https://github.com/LifeLoggerAI/urai-spatial','git@github.com:LifeLoggerAI/urai-spatial.git')) { throw 'CANONICAL_ORIGIN_REQUIRED' }
if([string]::IsNullOrEmpty($Destination)) {
 $Destination=Join-Path $env:TEMP ('URAI_VISUAL_CC0_'+[guid]::NewGuid().ToString('N').Substring(0,10))
}
if(Test-Path -LiteralPath $Destination) { throw 'DESTINATION_ALREADY_EXISTS' }
$head=(& git -C $root rev-parse $gitRef).Trim()
if($LASTEXITCODE -ne 0 -or $head -notmatch '^[a-f0-9]{40}$') { throw 'LOCAL_VISUAL_BRANCH_NOT_FETCHED' }
# A pinned local branch is used. No force reset, fetch, or force checkout.
# It is valid to run without hosted Actions or new GitHub access.
& git -C $root worktree add --detach --no-checkout $Destination $head
if($LASTEXITCODE -ne 0) { throw 'ISOLATED_WORKTREE_CREATION_FAILED' }
$runner=Join-Path $Destination 'scripts/RUN_HOME_CC0_REAL_PIXEL_PROOF_20261022.ps1'
try {
 & git -C $Destination sparse-checkout init --cone
 if($LASTEXITCODE -ne 0) { throw 'SPARSE_INIT_FAILED' }
 & git -C $Destination sparse-checkout set urai-tier1 scripts operations apps packages tests
 if($LASTEXITCODE -ne 0) { throw 'SPARSE_SELECTION_FAILED' }
 & git -C $Destination read-tree -mu HEAD
 if($LASTEXITCODE -ne 0) { throw 'SPARSE_MATERIALIZATION_FAILED' }
 if(-not (Test-Path -LiteralPath $runner)) { throw 'PINNED_RUNNER_MISSING' }
 $actual=(& git -C $Destination rev-parse HEAD).Trim()
 if($actual -ne $head) { throw 'ISOLATED_HEAD_DRIFT' }
 $changes=@(& git -C $Destination status --porcelain --untracked-files=normal)
 if($changes.Count -ne 0) { throw 'ISOLATED_WORKTREE_NOT_CLEAN' }
 if(-not (Test-Path -LiteralPath (Join-Path $Destination 'urai-tier1/node_modules/next'))) {
  Write-Host 'URAI_VISUAL_RUNTIME_DEPENDENCIES_MISSING: install exact locked pnpm dependencies in this isolated worktree before browser proof.'
  throw 'ISOLATED_RUNTIME_DEPENDENCIES_MISSING'
 }
 $env:URAI_HOME_CC0_NONPRODUCTION_BOOTSTRAP='isolated-exact-head'
 try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -ExpectedHead $head -Port $Port
  if($LASTEXITCODE -ne 0) { throw ('HOME_CC0_BROWSER_PROOF_FAILED_EXIT='+$LASTEXITCODE) }
 } finally { Remove-Item Env:URAI_HOME_CC0_NONPRODUCTION_BOOTSTRAP -ErrorAction SilentlyContinue }
} finally {
 Write-Host ('URAI_VISUAL_EVIDENCE_WORKTREE='+$Destination)
 Write-Host ('URAI_VISUAL_EVIDENCE_HEAD='+$head)
 Write-Host 'Worktree intentionally retained for receipt and screenshot inspection. No release admission.'
}
