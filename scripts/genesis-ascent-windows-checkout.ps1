# UrAi Genesis native Ascent source checkout for authorized Windows review.
# Does not install dependencies, deploy, publish, merge, or approve media.
# Excludes historical literal '*audit' directories that Windows cannot create.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string] $Commit,

    [Parameter(Mandatory = $true)]
    [string] $Destination,

    [string] $Source = 'https://github.com/LifeLoggerAI/urai-spatial.git'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'GIT_NOT_AVAILABLE_IN_EXISTING_WINDOWS_ENVIRONMENT'
}

$target = [System.IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $target) {
    throw 'DESTINATION_ALREADY_EXISTS_SELECT_A_FRESH_PRIVATE_DIRECTORY'
}
$parent = [System.IO.Path]::GetDirectoryName($target)
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -Path $parent -ItemType Directory -Force | Out-Null
}

# --no-checkout prevents Git for Windows from attempting invalid NTFS paths.
& git clone --no-checkout -- $Source $target
if ($LASTEXITCODE -ne 0) { throw 'AUTHORIZED_SOURCE_CLONE_FAILED' }

& git -C $target sparse-checkout init --no-cone
if ($LASTEXITCODE -ne 0) { throw 'SPARSE_CHECKOUT_INIT_FAILED' }

# Git sparse-checkout's non-cone gitignore-style patterns are UTF-8 without BOM.
# Keep all ordinary source; omit only the two known historical audit trees.
$patternFile = Join-Path $target '.git/info/sparse-checkout'
$patternText = "/*`n!/*audit/`n!/urai-tier1/*audit/`n"
[System.IO.File]::WriteAllText($patternFile, $patternText, [System.Text.UTF8Encoding]::new($false))

& git -C $target checkout --detach $Commit
if ($LASTEXITCODE -ne 0) { throw 'EXACT_COMMIT_CHECKOUT_FAILED' }

$actual = (& git -C $target rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $actual -cne $Commit) {
    throw 'CHECKED_OUT_SHA_DIFFERS_FROM_REQUESTED_SHA'
}

$required = @(
    'urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx',
    'urai-tier1/src/spatial/navigation/homeAscentFlight.ts',
    'scripts/genesis-ascent-camera-sampler.mjs',
    'scripts/genesis-ascent-patched-review-capture.mjs',
    'scripts/genesis-ascent-pixel-gate.py'
)
foreach ($relative in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $target $relative) -PathType Leaf)) {
        throw "REQUIRED_NATIVE_SOURCE_MISSING: $relative"
    }
}
foreach ($excluded in @('*audit', 'urai-tier1/*audit')) {
    if (Test-Path -LiteralPath (Join-Path $target $excluded)) {
        throw "WINDOWS_INVALID_AUDIT_TREE_WAS_MATERIALIZED: $excluded"
    }
}

Write-Output "URAI_GENESIS_PRIVATE_SOURCE_CHECKOUT_READY: $actual"
Write-Output "SOURCE_PATH: $target"
Write-Output 'BUILD_NOT_RUN; WEBGL_NOT_CAPTURED; RELEASE_NO_GO_HOLD'
