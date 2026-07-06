#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const appRoot = path.join(repoRoot, 'urai-tier1', 'src', 'app')
const middlewareCandidates = [
  path.join(repoRoot, 'middleware.ts'),
  path.join(repoRoot, 'src', 'middleware.ts'),
  path.join(repoRoot, 'urai-tier1', 'middleware.ts'),
  path.join(repoRoot, 'urai-tier1', 'src', 'middleware.ts'),
]

const guardedRoutePatterns = [
  /^admin(?:\/|$)/,
  /^brand-system(?:\/|$)/,
  /^demo(?:\/|$)/,
  /^internal(?:\/|$)/,
]

const allowedRuntimeGuardTokens = [
  'notFound()',
  'redirect(',
  'NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES',
  'NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES',
  'NEXT_PUBLIC_ALLOW_ADMIN_ROUTES',
  'URAI_ALLOW_PUBLIC_DEMO_ROUTES',
  'URAI_ALLOW_INTERNAL_ROUTES',
  'URAI_ALLOW_ADMIN_ROUTES',
]

const routeGuardEnvByPrefix = {
  admin: ['NEXT_PUBLIC_ALLOW_ADMIN_ROUTES', 'URAI_ALLOW_ADMIN_ROUTES'],
  'brand-system': ['NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES', 'URAI_ALLOW_INTERNAL_ROUTES'],
  demo: ['NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES', 'URAI_ALLOW_PUBLIC_DEMO_ROUTES'],
  internal: ['NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES', 'URAI_ALLOW_INTERNAL_ROUTES'],
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath))
      continue
    }
    if (entry.isFile()) files.push(absolutePath)
  }

  return files
}

function routePathForFile(file) {
  const relative = path.relative(appRoot, file).replaceAll(path.sep, '/')
  if (!/(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(relative)) return null
  return relative.replace(/\/page\.(?:ts|tsx|js|jsx)$/, '')
}

function routePrefix(routePath) {
  return routePath.split('/')[0]
}

function middlewareSource() {
  return middlewareCandidates
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => fs.readFileSync(candidate, 'utf8'))
    .join('\n')
}

function middlewareGuardsRoute(routePath, middlewareText) {
  const prefix = routePrefix(routePath)
  const envTokens = routeGuardEnvByPrefix[prefix] || []
  if (!middlewareText) return false
  if (!middlewareText.includes(`/${prefix}`)) return false
  if (!middlewareText.includes('NextResponse.rewrite') && !middlewareText.includes('NextResponse.redirect')) return false
  return envTokens.some((token) => middlewareText.includes(token))
}

function normalizeMarker(value) {
  return String(value).replaceAll('"', "'").replace(/\s+/g, '')
}

function requireFileTokens(failures, relativePath, tokens) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing`)
    return
  }

  try {
    const source = normalizeMarker(fs.readFileSync(absolutePath, 'utf8'))
    for (const token of tokens) {
      if (!source.includes(normalizeMarker(token))) {
        failures.push(`${relativePath} is missing required production marker: ${token}`)
      }
    }
  } catch (error) {
    failures.push(`Failed to read ${relativePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function checkVersionAssetContracts(failures) {
  const gatePath = path.join(repoRoot, 'urai-tier1', 'src', 'app', 'CanonicalAssetGates.tsx')
  if (!fs.existsSync(gatePath)) {
    failures.push('CanonicalAssetGates.tsx is missing')
    return
  }

  const gateSource = fs.readFileSync(gatePath, 'utf8')
  const contracts = [...gateSource.matchAll(/\['(v\d+)',\s*(\d+),/g)].map((match) => ({
    version: match[1],
    expected: Number(match[2]),
  }))
  if (contracts.length === 0) {
    failures.push('CanonicalAssetGates.tsx does not declare version asset contracts')
    return
  }

  for (const contract of contracts) {
    const manifestPath = path.join(
      repoRoot,
      'urai-tier1',
      'public',
      'assets',
      'urai',
      'final',
      'manifests',
      `${contract.version}-asset-factory-spatial-handoff.json`,
    )

    if (!fs.existsSync(manifestPath)) {
      failures.push(`${contract.version} handoff manifest is missing`)
      continue
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const ready = Number(manifest.ready)
      const missing = Number(manifest.missing)
      const assets = Array.isArray(manifest.assets) ? manifest.assets : []

      if (manifest.version !== contract.version) {
        failures.push(`${contract.version} manifest declares version ${String(manifest.version)}`)
      }
      if (!Number.isInteger(ready) || ready < 0 || !Number.isInteger(missing) || missing < 0) {
        failures.push(`${contract.version} manifest ready/missing counts must be non-negative integers`)
      } else if (ready + missing !== contract.expected) {
        failures.push(`${contract.version} manifest totals ${ready + missing}; runtime contract requires ${contract.expected}`)
      }
      if (assets.length !== ready) {
        failures.push(`${contract.version} manifest contains ${assets.length} assets but ready=${ready}`)
      }
      if (assets.some((asset) => asset?.status !== 'ready' || asset?.renderer !== 'provider')) {
        failures.push(`${contract.version} ready assets must have status=ready and renderer=provider`)
      }
    } catch (error) {
      failures.push(`${contract.version} handoff manifest is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

const failures = []
const middlewareText = middlewareSource()

for (const file of walk(appRoot)) {
  const routePath = routePathForFile(file)
  if (!routePath) continue
  if (!guardedRoutePatterns.some((pattern) => pattern.test(routePath))) continue

  const source = fs.readFileSync(file, 'utf8')
  const pageGuarded = allowedRuntimeGuardTokens.some((token) => source.includes(token))
  const middlewareGuarded = middlewareGuardsRoute(routePath, middlewareText)

  if (!pageGuarded && !middlewareGuarded) {
    failures.push(`${path.relative(repoRoot, file)} exposes /${routePath} without an explicit production guard`)
  }
}

requireFileTokens(failures, 'urai-tier1/src/app/privacy-controls/page.tsx', [
  "title: 'URAI Privacy Controls'",
  'data-route-polish="privacy-consent-console"',
  'export default function PrivacyControlsRoutePage()',
])

requireFileTokens(failures, 'urai-tier1/src/app/focus/page.tsx', [
  "import { FinalFocusChamber } from '@/app/FinalMemorySurfaces'",
  'data-urai-route-fingerprint="focus-selected-memory-camera-chamber"',
  'Selected memory camera chamber',
  '<FinalFocusChamber />',
])

requireFileTokens(failures, '.github/workflows/spatial-live-deploy.yml', [
  'workflow_dispatch:',
  'expected_sha:',
  'current_deployed_sha:',
  'rollback_sha:',
  'DEPLOY-EXACT-SHA',
  'EXERCISE-ROLLBACK',
  'workload_identity_provider:',
  'materialize-release-receipt.mjs',
  'verify-live-accessibility.mjs',
])

const staticConfigPath = path.join(repoRoot, 'firebase.static.json')
if (!fs.existsSync(staticConfigPath)) {
  failures.push('firebase.static.json is missing')
} else {
  try {
    const staticConfig = JSON.parse(fs.readFileSync(staticConfigPath, 'utf8'))
    const hosting = staticConfig.hosting || {}
    if (hosting.public !== 'urai-tier1/out') failures.push('firebase.static.json must publish urai-tier1/out')
    if (hosting.cleanUrls !== true) failures.push('firebase.static.json must enable cleanUrls')
    if (hosting.trailingSlash !== true) failures.push('firebase.static.json must enable trailingSlash')
    if (hosting.rewrites !== undefined && (!Array.isArray(hosting.rewrites) || hosting.rewrites.length !== 0)) {
      failures.push('firebase.static.json must not use rewrites that mask missing exported routes')
    }
  } catch (error) {
    failures.push(`firebase.static.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

checkVersionAssetContracts(failures)

if (failures.length > 0) {
  console.error('Production route and asset contract gate failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production route and asset contract gate passed: guarded routes, public route owners, manual release authority, static hosting, and version manifests are locked.')
