$ErrorActionPreference = 'Stop'

Write-Host 'UrAi Claude Code setup'
Write-Host '----------------------'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is required but was not found in PATH.'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required but was not found in PATH.'
}

$nodeVersionText = (& node --version).Trim().TrimStart('v')
$nodeMajor = 0
if (-not [int]::TryParse(($nodeVersionText -split '\.')[0], [ref]$nodeMajor) -or $nodeMajor -lt 22) {
  throw "UrAi requires Node.js 22 or newer. Detected: $nodeVersionText"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Warning 'pnpm is not available in PATH. UrAi uses pnpm@10. If Corepack is available, run: corepack enable; corepack prepare pnpm@10.0.0 --activate'
}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host 'Claude Code is not installed. Installing with the official Anthropic PowerShell installer...'
  try {
    irm https://claude.ai/install.ps1 | iex
  }
  catch {
    Write-Warning 'Direct installer failed. Trying WinGet fallback...'
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
      throw 'Neither the Anthropic installer nor WinGet was available. Install Claude Code manually from Anthropic, then rerun this script.'
    }
    winget install Anthropic.ClaudeCode
  }
}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  throw 'Claude Code install finished but claude is still not available in PATH. Restart PowerShell and rerun this script.'
}

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
  throw 'Run this script from inside the urai-spatial Git checkout.'
}

Set-Location $repoRoot

Write-Host "Repo: $repoRoot"
Write-Host ('Current SHA: ' + (git rev-parse HEAD))
Write-Host ('Current branch: ' + (git branch --show-current))
Write-Host ('Node: ' + (& node --version))
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  Write-Host ('pnpm: ' + (& pnpm --version))
}
Write-Host ('Claude Code: ' + (& claude --version))

if (-not (Test-Path 'CLAUDE.md')) {
  Write-Warning 'CLAUDE.md is not present on this checkout. Use a branch that contains the UrAi Claude operating contract before assigning Claude work.'
}

Write-Host ''
Write-Host 'Launching Claude Code.'
Write-Host 'When the Anthropic browser sign-in opens, sign in with adam@urailabs.com.'
Write-Host 'Use the existing Claude Pro subscription; do not create separate Anthropic API billing for normal interactive use.'
Write-Host 'Never paste your password, MFA code, recovery code, OAuth token, recovery code, or session cookie into an AI chat.'
Write-Host ''

claude
