# UrAi original Home real CC0 browser capture, on an ISOLATED CLEAN CHECKOUT ONLY.
# One entrypoint; source/rights pinned, no production, no deploy and no paid services.
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port=3107)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$review=$null
$server=$null
$ownsStage=$false
$receipt=$null
$oldNode=$env:NODE_ENV
$oldReview=$env:NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW
$oldRunner=$env:URAI_CC0_DEV_RUNNER
function Need([string]$condition) { throw "URAI_HOME_PROOF_BLOCKED:$condition" }
function Step([string]$label,[string[]]$NodeArgs) {
  & node @NodeArgs
  if($LASTEXITCODE -ne 0) { Need($label + ':exit=' + $LASTEXITCODE) }
}
try {
  if((node -v) -notmatch '^v22\.') { Need 'NODE22_REQUIRED' }
  $gitRoot=(& git -C $root rev-parse --show-toplevel).Trim()
  if($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($gitRoot) -ne [IO.Path]::GetFullPath($root)) { Need 'EXACT_REPO_ROOT_REQUIRED' }
  $origin=(& git -C $root remote get-url origin).Trim()
  if($LASTEXITCODE -ne 0 -or $origin -notin @(
      'https://github.com/LifeLoggerAI/urai-spatial.git',
      'https://github.com/LifeLoggerAI/urai-spatial',
      'git@github.com:LifeLoggerAI/urai-spatial.git'
  )) { Need 'CANONICAL_GITHUB_ORIGIN_REQUIRED' }
  $branch=(& git -C $root branch --show-current).Trim()
  $head=(& git -C $root rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0 -or $branch -ne 'visual/home-cc0-photographic-review-proof-20261022') { Need 'VISUAL_BRANCH_REQUIRED' }
  $changes=@(& git -C $root status --porcelain --untracked-files=normal)
  if($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { Need 'ISOLATED_CLEAN_WORKTREE_REQUIRED' }
  $stage=Join-Path $root 'urai-tier1/public/assets/urai/home-production/cc0-review'
  if(Test-Path -LiteralPath $stage) { Need 'REVIEW_STAGE_ALREADY_EXISTS_NO_OVERWRITE' }
  # Never use a pre-existing server as evidence for this freshly spawned runner.
  $portProbe=New-Object System.Net.Sockets.TcpClient
  try {
    $result=$portProbe.BeginConnect('127.0.0.1',$Port,$null,$null)
    if($result.AsyncWaitHandle.WaitOne(400) -and $portProbe.Connected) { Need 'PORT_IN_USE_REFUSE_FOREIGN_SERVER' }
  } catch {
    if($_.Exception.Message -like '*PORT_IN_USE_REFUSE_FOREIGN_SERVER*') { throw }
  } finally { $portProbe.Dispose() }
  $env:NODE_ENV='development'
  $env:URAI_CC0_DEV_RUNNER='acknowledge-nonproduction-only'
  $env:NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW='true'
  Push-Location $root
  try {
    Step 'CC0_ACQUISITION' @('scripts/home-cc0-source-review.mjs','acquire')
    Step 'CC0_SOURCE_VALIDATION' @('scripts/home-cc0-source-review.mjs','verify-source')
    # Source downloads stay ignored and private to this isolated checkout.
    $ownsStage=$true
    Step 'CC0_STAGE' @('scripts/home-cc0-source-review.mjs','stage')
    $tier=Join-Path $root 'urai-tier1'
    $server=Start-Process -FilePath 'corepack.cmd' -ArgumentList @('pnpm','dev','--port',"$Port") -WorkingDirectory $tier -PassThru -NoNewWindow
    $ready=$false
    for($i=0; $i -lt 100; $i++) {
      if($server.HasExited) { Need 'ORIGINAL_HOME_DEV_SERVER_EXITED' }
      try {
        $response=Invoke-WebRequest -Uri ("http://127.0.0.1:"+$Port+"/home/") -UseBasicParsing -TimeoutSec 2
        if($response.StatusCode -eq 200) { $ready=$true; break }
      } catch {}
      Start-Sleep -Milliseconds 500
    }
    if(-not $ready) { Need 'ORIGINAL_HOME_SERVER_NOT_REACHABLE' }
    & node 'scripts/home-cc0-browser-art-proof.mjs' --acknowledge-nonproduction "--port=$Port"
    $code=$LASTEXITCODE
    if($code -ne 0) { Need ('BROWSER_ART_PROOF_EXIT='+$code) }
    Write-Host ('URAI_HOME_CC0_HEAD='+$head)
    Write-Host 'URAI_HOME_CC0_BROWSER_RESOURCE_PROOF=PASS'
    Write-Host 'URAI_HOME_CC0_FINAL_ART_APPROVAL=PENDING; RELEASE=NO-GO'
  } finally { Pop-Location }
} finally {
  if($server -and -not $server.HasExited) {
    try { & taskkill.exe /PID $server.Id /T /F 2>$null | Out-Null } catch { try { Stop-Process -Id $server.Id -Force -ErrorAction Stop } catch {} }
  }
  if($ownsStage) {
    Push-Location $root
    try {
      # We own this stage because the initial preflight established absence.
      & node 'scripts/home-cc0-source-review.mjs' clean
      if($LASTEXITCODE -eq 0) { & node 'scripts/home-cc0-source-review.mjs' assert-excluded }
    } finally { Pop-Location }
  }
  $env:NODE_ENV=$oldNode
  $env:NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW=$oldReview
  $env:URAI_CC0_DEV_RUNNER=$oldRunner
}
