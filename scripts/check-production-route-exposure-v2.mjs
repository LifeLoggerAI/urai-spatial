#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appRoot = path.join(root, 'urai-tier1', 'src', 'app')
const failures = []
const guardedPrefixes = ['admin', 'brand-system', 'internal']
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

for (const file of walk(appRoot)) {
  const relative = path.relative(appRoot, file).replaceAll(path.sep, '/')
  if (!/(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(relative)) continue
  const route = relative.replace(/\/page\.(?:ts|tsx|js|jsx)$/, '')
  if (!guardedPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) continue
  const source = fs.readFileSync(file, 'utf8')
  if (!guardTokens.some((token) => source.includes(token))) failures.push(`${path.relative(root, file)} exposes /${route} without an explicit production guard`)
}

requireTokens('urai-tier1/src/app/demo/page.tsx', [
  "import CutOneReplayFilmPage from './replay-film/page'",
  'without exposing personal data',
  'return <CutOneReplayFilmPage />',
])
requireTokens('urai-tier1/src/app/demo/replay-film/page.tsx', [
  "export const dynamic = 'force-static'",
  'memoryId=demo%3Aquiet-reset',
  'manifestId=replay-recovery-thread',
  'demo=1',
  'data-demo-disclosure="not-personal-data"',
  'Demo fixture · not personal data',
  'href: demoFocusHref',
  'href: demoReplayHref',
])

requireTokens('urai-tier1/src/app/privacy-controls/page.tsx', [
  "import ConsentSanctuaryClient from './ConsentSanctuaryClient'",
  "const title = 'URAI Privacy — Permissions & Consent'",
  "alternates: { canonical: 'https://urai.app/privacy-controls/' }",
  "url: 'https://urai.app/privacy-controls/'",
  'twitter: {',
  "card: 'summary'",
  'return <ConsentSanctuaryClient />',
])
requireTokens('urai-tier1/src/app/privacy-controls/ConsentSanctuaryClient.tsx', [
  'data-route-owner="consent-sanctuary"',
  'data-privacy-source={loadState}',
  'applyOperationalConsentPolicy',
  'createOperationalExportRequest',
  'createOperationalDeletionRequest',
  'Confirm and request enforcement',
  'No private state was replaced with demo data.',
])
requireTokens('urai-tier1/src/lib/privacy/operationalPrivacyClient.ts', [
  'httpsCallable',
  "collection(getFirebaseDb(), 'users', uid, collectionName)",
])
requireTokens('apps/functions/src/privacyOperations.ts', [
  'applyConsentPolicy',
  'CONSENT_REVISION_CONFLICT',
  'processPrivacyEnforcementJob',
  'providerRevocationQueue',
  'createExportRequest',
  'processExportJob',
  'createDeletionRequest',
  'processDeletionQueueItem',
])

const focusRoutePath = 'urai-tier1/src/app/focus/page.tsx'
const focusRouteSource = read(focusRoutePath)
const focusImport = focusRouteSource.match(/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]\.\/FocusChamberClient['"]/) 
if (!focusImport) {
  failures.push(`${focusRoutePath} must default-import ./FocusChamberClient`)
} else {
  if (focusRouteSource.includes('<Suspense') || focusRouteSource.includes('Focus loading')) failures.push(`${focusRoutePath} must not restore a static Suspense loading shell`)
  if (!focusRouteSource.includes(`return <${focusImport[1]} />`)) failures.push(`${focusRoutePath} must directly render the imported FocusChamberClient component`)
}

const focusClientPath = 'urai-tier1/src/app/focus/FocusChamberClient.tsx'
const focusClientSource = read(focusClientPath)
for (const token of [
  'data-testid="urai-final-focus-chamber"',
  'requestUraiWorldTravel({',
  "destination: 'replay'",
  "entryPortal: 'focus-memory-aperture'",
  'replayManifestId: memory.replayManifest.id',
  'requestUraiWorldReturn()',
  'aria-label={`Open Replay for ${memory.title}`}',
  'No personal memory is displayed in this neutral observatory.',
  'data-chamber-state={chamberState}',
]) {
  if (!focusClientSource.includes(token)) failures.push(`${focusClientPath} is missing: ${token}`)
}
for (const [label, pattern] of [
  ['memory identity', /data-memory-id=\{memory(?:\?\.)?id\}/],
  ['star identity', /data-star-id=\{memory(?:\?\.)?star\.id\}/],
  ['manifest identity', /data-manifest-id=\{memory(?:\?\.)?replayManifest\.id\}/],
]) {
  if (!pattern.test(focusClientSource)) failures.push(`${focusClientPath} is missing truthful ${label} binding`)
}
if (!/if \(!memory \|\| !replayHref(?: \|\| committed)?\) return/.test(focusClientSource)) failures.push(`${focusClientPath} must fail closed before Replay when no authorized memory or route exists`)

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
