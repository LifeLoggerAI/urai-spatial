# Nonproduction original UrAi Home photographic proof. For isolated source-pinned
# Windows worktrees only. Never merges, deploys, promotes or spends provider funds.
[CmdletBinding()]
param(
  [ValidateRange(1024,65535)][int]$Port=3107,
  [string]$ExpectedHead=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$server=$null
$ownsStage=$false
$oldNode=$env:NODE_ENV
$oldReview=$env:NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW
$oldRunner=$env:URAI_CC0_DEV_RUNNER
$failure=$null
$cleanupFailure=$null
$head='UNVERIFIED'
$runDir=Join-Path $root ('artifacts\home-cc0-windows-'+[guid]::NewGuid().ToString('N').Substring(0,12))
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$receiptPath=Join-Path $runDir 'windows-launch-receipt.json'
$receipt=[ordered]@{
  schema='urai-home-cc0-windows-proof-v3'
  status='BLOCKED_NO_ART_APPROVAL'
  sourceHead='UNVERIFIED'
  stagedAssetsVerified=$false
  browserEvidence='NOT_EXECUTED'
  releaseApproved=$false
  founderVisualApproved=$false
  providerSpend=$false
  serverStdout='next.stdout.log'
  serverStderr='next.stderr.log'
}
function Fail([string]$reason) { throw ('URAI_HOME_PROOF_BLOCKED:'+ $reason) }
function NodeStep([string]$label,[string[]]$NodeArgs) {
  & node @NodeArgs
  if($LASTEXITCODE -ne 0) { Fail ($label+':exit='+$LASTEXITCODE) }
}
try {
  if((node -v) -notmatch '^v22\.') { Fail 'NODE22_REQUIRED' }
  $gitRoot=(& git -C $root rev-parse --show-toplevel).Trim()
  if($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($gitRoot).TrimEnd('\','/') -ine [IO.Path]::GetFullPath($root).TrimEnd('\','/')) { Fail 'EXACT_GIT_ROOT_REQUIRED' }
  $origin=(& git -C $root remote get-url origin).Trim()
  if($LASTEXITCODE -ne 0 -or $origin -notin @(
    'https://github.com/LifeLoggerAI/urai-spatial.git',
    'https://github.com/LifeLoggerAI/urai-spatial',
    'git@github.com:LifeLoggerAI/urai-spatial.git'
  )) { Fail 'CANONICAL_GITHUB_ORIGIN_REQUIRED' }
  $branch=(& git -C $root branch --show-current).Trim()
  $head=(& git -C $root rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0 -or $head -notmatch '^[a-f0-9]{40}$') { Fail 'SOURCE_COMMIT_UNAVAILABLE' }
  $receipt.sourceHead=$head
  if($ExpectedHead -ne '' -and ($ExpectedHead -notmatch '^[a-f0-9]{40}$' -or $ExpectedHead -ne $head)) { Fail 'PINNED_SOURCE_HEAD_MISMATCH' }
  $isVisualBranch=$branch -eq 'visual/home-cc0-photographic-review-proof-20261022'
  $isIsolatedDetached=$branch -eq '' -and $ExpectedHead -eq $head -and $env:URAI_HOME_CC0_NONPRODUCTION_BOOTSTRAP -eq 'isolated-exact-head'
  if(-not $isVisualBranch -and -not $isIsolatedDetached) { Fail 'VISUAL_OWNER_OR_ISOLATED_DETACHED_HEAD_REQUIRED' }
  $changes=@(& git -C $root status --porcelain --untracked-files=normal)
  if($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { Fail 'CLEAN_WORKTREE_REQUIRED' }
  if($env:URAI_FIREBASE_STATIC_EXPORT -eq 'true' -or $env:NODE_ENV -eq 'production') { Fail 'PRODUCTION_CONTEXT_FORBIDDEN' }
  $stage=Join-Path $root 'urai-tier1\public\assets\urai\home-production\cc0-review'
  if(Test-Path -LiteralPath $stage) { Fail 'REVIEW_STAGE_ALREADY_EXISTS' }
  $tcp=New-Object Net.Sockets.TcpClient
  try {
    $connect=$tcp.BeginConnect('127.0.0.1',$Port,$null,$null)
    if($connect.AsyncWaitHandle.WaitOne(300) -and $tcp.Connected) { Fail 'PORT_ALREADY_OWNED' }
  } finally { $tcp.Dispose() }
  Push-Location $root
  try {
    $env:NODE_ENV='development'
    $env:URAI_CC0_DEV_RUNNER='acknowledge-nonproduction-only'
    $env:NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW='true'
    NodeStep 'ASSET_ACQUISITION' @('scripts/home-cc0-source-review.mjs','acquire')
    NodeStep 'ASSET_SOURCE_HASHES' @('scripts/home-cc0-source-review.mjs','verify-source')
    $ownsStage=$true
    NodeStep 'ASSET_STAGE' @('scripts/home-cc0-source-review.mjs','stage')
    $receipt.stagedAssetsVerified=$true
    $tier=Join-Path $root 'urai-tier1'
    & node (Join-Path $tier 'scripts\require-runtime-deps.mjs')
    if($LASTEXITCODE -ne 0) { Fail 'ISOLATED_RUNTIME_DEPS_INCOMPLETE' }
    $outFile=Join-Path $runDir 'next.stdout.log'
    $errFile=Join-Path $runDir 'next.stderr.log'
    $server=Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d','/c',('corepack pnpm --dir urai-tier1 dev --port '+$Port)) -WorkingDirectory $root -RedirectStandardOutput $outFile -RedirectStandardError $errFile -PassThru
    $ready=$false
    for($i=0; $i -lt 120; $i++) {
      if($server.HasExited) { Fail 'NEXT_DEV_EXITED' }
      try {
        $response=Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:'+$Port+'/home/') -TimeoutSec 3
        if($response.StatusCode -eq 200) { $ready=$true; break }
      } catch {}
      Start-Sleep -Milliseconds 500
    }
    if(-not $ready) { Fail 'ORIGINAL_HOME_HTTP_200_NOT_OBSERVED' }
    & node 'scripts/home-cc0-browser-art-proof.mjs' '--acknowledge-nonproduction' ('--port='+$Port)
    if($LASTEXITCODE -ne 0) { Fail ('BROWSER_EVIDENCE_FAIL_EXIT='+$LASTEXITCODE) }
    $receipt.browserEvidence='BROWSER_RESOURCE_PASS_HUMAN_ART_APPROVAL_PENDING'
    $receipt.status='BROWSER_RESOURCE_PASS_PENDING_HUMAN_ART_REVIEW'
  } finally {
    Pop-Location
  }
} catch {
  $failure=$_.Exception.Message
  $receipt.failure=$failure
} finally {
  if($server -and -not $server.HasExited) {
    try {
      & taskkill.exe /PID $server.Id /T /F 2>$null | Out-Null
    } catch {
      try { Stop-Process -Id $server.Id -Force -ErrorAction Stop } catch { $cleanupFailure='FAILED_TO_STOP_OWNED_DEV_SERVER' }
    }
  }
  if($ownsStage) {
    Push-Location $root
    try {
      & node 'scripts/home-cc0-source-review.mjs' clean
      if($LASTEXITCODE -ne 0) { $cleanupFailure='CANDIDATE_STAGE_CLEAN_FAILED' }
      else {
        & node 'scripts/home-cc0-source-review.mjs' assert-excluded
        if($LASTEXITCODE -ne 0) { $cleanupFailure='UNAPPROVED_ART_STILL_IN_PUBLIC' }
      }
    } catch { $cleanupFailure='CANDIDATE_STAGE_CLEAN_THROWN' }
    finally { Pop-Location }
  }
  $env:NODE_ENV=$oldNode
  $env:NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW=$oldReview
  $env:URAI_CC0_DEV_RUNNER=$oldRunner
  if($cleanupFailure) {
    $receipt.cleanupFailure=$cleanupFailure
    $receipt.status='BLOCKED_CLEANUP_FAILURE'
  }
  if($failure) { $receipt.status='BLOCKED_NO_ART_APPROVAL' }
  $receipt.completedAt=(Get-Date).ToString('o')
  $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
  Write-Host ('URAI_HOME_WINDOWS_RECEIPT='+$receiptPath)
  Write-Host ('URAI_HOME_SOURCE_HEAD='+$head)
  Write-Host ('URAI_HOME_STATUS='+$receipt.status)
  Write-Host 'URAI_FINAL_VISUAL_ART_APPROVAL=PENDING; RELEASE=NO-GO'
}
if($failure) { throw $failure }
if($cleanupFailure) { throw $cleanupFailure }
