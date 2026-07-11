#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appRoot = path.join(root, 'urai-tier1', 'src', 'app')
const failures = []
const guardedPrefixes = ['admin', 'brand-system', 'demo', 'internal']
const guardTokens = ['notFound()', 'redirect(', 'NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES', 'NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES', 'NEXT_PUBLIC_ALLOW_ADMIN_ROUTES', 'URAI_ALLOW_PUBLIC_DEMO_ROUTES', 'URAI_ALLOW_INTERNAL_ROUTES', 'URAI_ALLOW_ADMIN_ROUTES']

const walk = (directory) => fs.existsSync(directory)
  ? fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolute = path.join(directory, entry.name)
      return entry.isDirectory() ? walk(absolute) : entry.isFile() ? [absolute] : []
    })
  : []

const read = (relative) => {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative} is missing`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

const requireTokens = (relative, tokens) => {
  const source = read(relative)
  for (const token of tokens) if (!source.includes(token)) failures.push(`${relative} is missing: ${token}`)
}

const requireAbsentTokens = (relative, tokens) => {
  const source = read(relative)
  for (const token of tokens) if (source.includes(token)) failures.push(`${relative} must not contain: ${token}`)
}

for (const file of walk(appRoot)) {
  const relative = path.relative(appRoot, file).replaceAll(path.sep, '/')
  if (!/(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(relative)) continue
  const route = relative.replace(/\/page\.(?:ts|tsx|js|jsx)$/, '')
  if (!guardedPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) continue
  const source = fs.readFileSync(file, 'utf8')
  if (!guardTokens.some((token) => source.includes(token))) failures.push(`${path.relative(root, file)} exposes /${route} without an explicit production guard`)
}

requireTokens('urai-tier1/src/app/privacy-controls/page.tsx', [
  "title: 'URAI Privacy Controls Preview'",
  'data-route-polish="privacy-consent-console"',
  'data-privacy-controls-state="non-operational-preview"',
  'Nothing on this page is a working privacy control.',
  'export default function PrivacyControlsRoutePage()',
])
requireAbsentTokens('urai-tier1/src/app/privacy-controls/page.tsx', [
  '<button',
  'Private by default',
  'No hidden raw-data sharing',
  'Export and deletion controls visible',
  'Human approval before real-world action',
])
requireTokens('urai-tier1/src/app/focus/page.tsx', ["import FocusChamberClient from './FocusChamberClient'", '<Suspense', '<FocusChamberClient />'])
requireTokens('urai-tier1/src/app/focus/FocusChamberClient.tsx', ['data-testid="urai-final-focus-chamber"', 'data-route-polish="selected-memory-camera-chamber"', 'Selected memory chamber.', "next.set('memoryId', memoryId)", "next.set('manifestId', manifestId)", "next.set('node', node)"])
requireTokens('urai-tier1/src/app/layout.tsx', ['NEXT_PUBLIC_URAI_BUILD_SHA', "'urai-deployed-sha': deployedSha", 'data-deployed-sha={deployedSha}', "data-deployment-evidence={deployedSha === 'unverified' ? 'missing' : 'embedded'}"])

const staticConfig = JSON.parse(read('firebase.static.json') || '{}').hosting || {}
if (staticConfig.public !== 'urai-tier1/out') failures.push('firebase.static.json must publish urai-tier1/out')
if (staticConfig.cleanUrls !== true) failures.push('firebase.static.json must enable cleanUrls')
if (staticConfig.trailingSlash !== true) failures.push('firebase.static.json must enable trailingSlash')
if (staticConfig.rewrites !== undefined && (!Array.isArray(staticConfig.rewrites) || staticConfig.rewrites.length !== 0)) failures.push('firebase.static.json must not mask missing static routes with rewrites')

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
