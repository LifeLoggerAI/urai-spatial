#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appRoot = path.join(root, 'urai-tier1', 'src', 'app')
const failures = []
const guardedPrefixes = ['admin', 'brand-system', 'demo', 'internal']
const guardTokens = [
  'notFound()',
  'redirect(',
  'NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES',
  'NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES',
  'NEXT_PUBLIC_ALLOW_ADMIN_ROUTES',
  'URAI_ALLOW_PUBLIC_DEMO_ROUTES',
  'URAI_ALLOW_INTERNAL_ROUTES',
  'URAI_ALLOW_ADMIN_ROUTES',
]

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolute)
    return entry.isFile() ? [absolute] : []
  })
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!fs.existsSync(absolute)) {
    failures.push(`${relativePath} is missing`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

function requireTokens(relativePath, tokens, forbidden = []) {
  const source = read(relativePath)
  for (const token of tokens) if (!source.includes(token)) failures.push(`${relativePath} is missing: ${token}`)
  for (const token of forbidden) if (source.includes(token)) failures.push(`${relativePath} contains forbidden value: ${token}`)
}

for (const file of walk(appRoot)) {
  const relative = path.relative(appRoot, file).replaceAll(path.sep, '/')
  if (!/(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(relative)) continue
  const route = relative.replace(/\/page\.(?:ts|tsx|js|jsx)$/, '')
  if (!guardedPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) continue
  const source = fs.readFileSync(file, 'utf8')
  if (!guardTokens.some((token) => source.includes(token))) {
    failures.push(`${path.relative(root, file)} exposes /${route} without an explicit production guard`)
  }
}

requireTokens('urai-tier1/src/app/privacy-controls/page.tsx', [
  "title: 'URAI Privacy Controls'",
  'data-route-polish="privacy-consent-console"',
  'export default function PrivacyControlsRoutePage()',
])
requireTokens('urai-tier1/src/app/focus/page.tsx', [
  "import { FinalFocusChamber } from '@/app/FinalMemorySurfaces'",
  'data-urai-route-fingerprint="focus-selected-memory-camera-chamber"',
  'Selected memory camera chamber',
  '<FinalFocusChamber />',
])
requireTokens('urai-tier1/src/app/layout.tsx', [
  'NEXT_PUBLIC_URAI_BUILD_SHA',
  "'urai-deployed-sha': deployedSha",
  'data-deployed-sha={deployedSha}',
  "data-deployment-evidence={deployedSha === 'unverified' ? 'missing' : 'embedded'}",
])
requireTokens('scripts/deploy-exact-static-release.mjs', [
  'URAI_DEPLOY_CONFIRM must equal DEPLOY VERIFIED URAI',
  'URAI_TARGET_SHA must be a full lowercase 40-character SHA',
  'URAI_ROLLBACK_SHA must be a full lowercase 40-character SHA',
  "'--config', 'firebase.static.json', '--only', 'hosting'",
  'Post-deploy live content or SHA verification failed',
  'production-release-',
])
requireTokens('.github/workflows/urai-spatial-deploy.yml', [
  'name: URAI Spatial Exact-SHA Deploy',
  'workflow_dispatch:',
  'target_sha:',
  'rollback_sha:',
  'certification_run_id:',
  'Type DEPLOY VERIFIED URAI',
  'environment: production',
  'v50-canonical-evidence-${{ inputs.target_sha }}',
  'node scripts/check-deployment-authority.mjs',
  'node scripts/deploy-exact-static-release.mjs',
], ['push:', 'pull_request:'])

const staticConfig = JSON.parse(read('firebase.static.json') || '{}').hosting || {}
if (staticConfig.public !== 'urai-tier1/out') failures.push('firebase.static.json must publish urai-tier1/out')
if (staticConfig.cleanUrls !== true) failures.push('firebase.static.json must enable cleanUrls')
if (staticConfig.trailingSlash !== true) failures.push('firebase.static.json must enable trailingSlash')
if (staticConfig.rewrites !== undefined && (!Array.isArray(staticConfig.rewrites) || staticConfig.rewrites.length !== 0)) {
  failures.push('firebase.static.json must not use rewrites that mask missing static routes')
}

const gateSource = read('urai-tier1/src/app/CanonicalAssetGates.tsx')
const contracts = [...gateSource.matchAll(/\['(v\d+)',\s*(\d+),/g)].map((match) => ({ version: match[1], expected: Number(match[2]) }))
if (!contracts.length) failures.push('CanonicalAssetGates.tsx does not declare version contracts')
for (const { version, expected } of contracts) {
  const relative = `urai-tier1/public/assets/urai/final/manifests/${version}-asset-factory-spatial-handoff.json`
  try {
    const manifest = JSON.parse(read(relative))
    const ready = Number(manifest.ready)
    const missing = Number(manifest.missing)
    const assets = Array.isArray(manifest.assets) ? manifest.assets : []
    if (manifest.version !== version) failures.push(`${relative} declares ${String(manifest.version)}`)
    if (!Number.isInteger(ready) || ready < 0 || !Number.isInteger(missing) || missing < 0) failures.push(`${relative} has invalid ready/missing counts`)
    else if (ready + missing !== expected) failures.push(`${relative} totals ${ready + missing}; expected ${expected}`)
    if (assets.length !== ready) failures.push(`${relative} contains ${assets.length} assets but ready=${ready}`)
    if (assets.some((asset) => asset?.status !== 'ready' || asset?.renderer !== 'provider')) failures.push(`${relative} includes a non-provider ready asset`)
  } catch (error) {
    failures.push(`${relative} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length) {
  console.error('Production route exposure v2 failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production route exposure v2 passed')
console.log('Canonical routes, embedded SHA evidence, manual exact-SHA Hosting authority, and asset manifests are locked')
