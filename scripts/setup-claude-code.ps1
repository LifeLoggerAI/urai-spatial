$ErrorActionPreference = 'Stop'

Write-Host 'UrAi Claude Code setup'
Write-Host '----------------------'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is required but was not found in PATH.'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required but was not found in PATH.'
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

if (-not (Test-Path 'CLAUDE.md')) {
  Write-Warning 'CLAUDE.md is not present on this checkout. Use branch claude-code-setup-20260916 or carry the setup commit before assigning Claude work.'
}

Write-Host ''
Write-Host 'Launching Claude Code.'
Write-Host 'When the Anthropic browser sign-in opens, sign in with adam@urailabs.com.'
Write-Host 'Use the existing Claude Pro subscription; do not create an API key or separate API billing for this setup.'
Write-Host 'Never paste your password, MFA code, recovery code, or session cookie into an AI chat.'
Write-Host ''

claude
