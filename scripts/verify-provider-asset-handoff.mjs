#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const assetRoot = path.join(root, 'urai-tier1', 'public', 'assets', 'urai')
const handoffPath = path.join(assetRoot, 'final', 'manifests', 'asset-factory-spatial-handoff.json')
const registryPath = path.join(root, 'urai-tier1', 'src', 'spatial', 'assets', 'uraiAssets.ts')
const evidenceDirectory = path.join(root, 'release-control-evidence')
const evidencePath = path.join(evidenceDirectory, 'provider-asset-verification.json')

const corePaths = new Set([
  'home/home-threshold-main.webp',
  'home/home-threshold-mobile.webp',
  'home/home-ground-portal.webp',
  'home/home-sky-ascent.webp',
  'ground/ground-world-main.webp',
  'ground/ground-world-mobile.webp',
  'ground/ground-reception.webp',
  'ground/ground-privacy-sanctuary.webp',
  'ground/ground-logistics.webp',
  'ground/ground-wellness.webp',
  'ground/ground-memory-archive.webp',
  'life-map/life-map-galaxy-main.webp',
  'life-map/life-map-galaxy-mobile.webp',
  'life-map/life-map-node-threshold.webp',
  'life-map/life-map-node-becoming.webp',
  'life-map/life-map-node-studio.webp',
  'focus/focus-memory-chamber-main.webp',
  'focus/focus-memory-chamber-mobile.webp',
  'replay/replay-memory-film-main.webp',
  'replay/replay-memory-film-mobile.webp',
  'mirror/mirror-reflection-main.webp',
  'mirror/mirror-reflection-mobile.webp',
  'mirror/mirror-pattern-glyph.webp',
  'passport/passport-vault-main.webp',
  'passport/passport-vault-mobile.webp',
  'passport/passport-ownership-seal.webp',
  'privacy-controls/privacy-controls-main.webp',
  'privacy-controls/privacy-controls-mobile.webp',
  'privacy-controls/privacy-model-access.webp',
  'privacy-controls/privacy-location-precision.webp',
  'location-map/location-emotional-weather-main.webp',
  'location-map/location-emotional-weather-mobile.webp',
  'location-map/location-place-node.webp',
  'status/status-route-matrix-main.webp',
  'status/status-route-matrix-mobile.webp',
  'status/status-health-pill.webp',
  'ui/orb-idle.webp',
  'ui/orb-active.webp',
  'ui/orb-listening.webp',
  'avatars/receptionist.webp',
  'avatars/privacy-steward.webp',
  'avatars/schedule-steward.webp',
  'avatars/wellness-guide.webp',
  'avatars/relationship-liaison.webp',
  'avatars/logistics-helper.webp',
  'avatars/archivist.webp',
  'avatars/operator.webp',
  'avatars/builder.webp',
  'avatars/protector.webp',
  'avatars/mirror.webp',
  'avatars/guide.webp',
])

const routeOwnerChecks = [
  {
    routes: ['/', '/home'],
    files: [
      'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx',
      'urai-tier1/src/app/AssetDrivenHomeWorld.tsx',
      'urai-tier1/src/spatial/layout/HomeWorldProduction.tsx',
      'urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx',
    ],
    renderMode: 'asset-driven-spatial',
    required: [
      'AssetDrivenHomeWorld',
      'HomeWorldProduction',
      'data-urai-home-runtime="asset-driven-primary-with-procedural-degraded-fallback"',
      'data-home-visual-owner="asset-driven-personalized-sanctuary"',
      'data-home-primary-owner="asset-driven"',
      'data-home-real-world-first="true"',
      'data-home-visible-world="final-physical-sanctuary-memory-rooms"',
      'data-home-visible-portals="false"',
      'data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout"',
      'data-home-embodied-self="privacy-preserving-shadow"',
      'data-home-movement="walk-keyboard-click-touch"',
      'data-home-audio="silent-fallback"',
      'home-authored-terrain',
      'home-mountain-horizon',
      'home-living-vegetation',
      'data-testid="urai-home-embodied-avatar"',
      'home-orb-sanctuary',
      'home-ground-environmental-threshold',
      'home-life-map-sky-lookout',
      'aria-label="Open Ground directly"',
      'aria-label="Open Life Map directly"',
    ],
    forbidden: [
      'EmbodiedHomeSpatialCanvas',
      'assetCssStack(homeAssets.',
      'home-authored-art',
      '--home-provider-',
      'data-home-visual-owner="final-coherent-sanctuary"',
      'FinalHomeWorld',
      'HomeSanctuaryWorld',
      'data-home-asset-mode=',
      'data-home-personalization-mode=',
      'home-personalized-places-',
      'home-orb-state-',
      'name={`home-${type}-portal-world-owned`}',
      '<WorldPortal type="ground"',
      '<WorldPortal type="life-map"',
    ],
  },
  {
    routes: ['/ground'],
    files: [
      'urai-tier1/src/app/GroundSpatialWorldClean.tsx',
      'urai-tier1/src/app/ground/GroundContinuityArchitecture.tsx',
      'urai-tier1/src/app/ground/EmbodiedGroundScene.tsx',
    ],
    renderMode: 'procedural-spatial',
    required: [
      'GroundContinuityArchitecture',
      'EmbodiedGroundScene',
      'data-ground-visual-owner="shared-continuity-architecture"',
      'ground-continuity-architectural-shell',
      'ground-walkable-navigation-surface',
      'ground-enterable-threshold-',
    ],
    forbidden: ['groundAssets', 'assetCssStack(groundAssets.', 'ground-authored-art', '--ground-provider-'],
  },
  { routes: ['/life-map'], files: ['urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'], renderMode: 'provider', assetSet: 'lifeMapAssets' },
  { routes: ['/focus'], files: ['urai-tier1/src/app/focus/FocusChamberClient.tsx'], renderMode: 'provider', assetSet: 'focusAssets' },
  { routes: ['/replay'], files: ['urai-tier1/src/app/replay/CinematicReplayClient.tsx'], renderMode: 'provider', assetSet: 'replayAssets' },
  { routes: ['/passport'], files: ['urai-tier1/src/app/FinalPassportVault.tsx'], renderMode: 'provider', assetSet: 'passportAssets' },
  {
    routes: ['/privacy-controls'],
    files: [
      'urai-tier1/src/app/privacy-controls/page.tsx',
      'urai-tier1/src/app/privacy-controls/ConsentSanctuaryClient.tsx',
    ],
    renderMode: 'procedural-spatial',
    required: [
      'ConsentSanctuaryClient',
      'data-route-owner="consent-sanctuary"',
      'data-privacy-source={loadState}',
      'data-enforcement-state={policy.enforcement.state}',
      '<Canvas',
      'applyOperationalConsentPolicy',
      'createOperationalExportRequest',
      'createOperationalDeletionRequest',
      'DEMONSTRATION — no personal data',
    ],
    forbidden: [
      'privacyControlsAssets',
      'assetCssStack(privacyControlsAssets.',
      'UraiAutonomousV1Realms',
    ],
  },
  { routes: ['/status'], files: ['urai-tier1/src/app/status/page.tsx'], renderMode: 'provider', assetSet: 'statusAssets' },
]

function normalizeCanonicalPath(value) {
  return String(value || '').replace(/^\/?assets\/urai\//, '')
}

function isSafeCanonicalPath(value) {
  if (!value || value.startsWith('/') || value.includes('\\')) return false
  if (path.posix.normalize(value) !== value) return false
  return value.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a valid RIFF/WEBP file')
  }

  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const data = offset + 8

    if (chunk === 'VP8X') {
      if (data + 10 > buffer.length) throw new Error('truncated VP8X header')
      return { width: 1 + readUInt24LE(buffer, data + 4), height: 1 + readUInt24LE(buffer, data + 7), codec: chunk }
    }

    if (chunk === 'VP8 ') {
      if (data + 10 > buffer.length || buffer[data + 3] !== 0x9d || buffer[data + 4] !== 0x01 || buffer[data + 5] !== 0x2a) {
        throw new Error('invalid VP8 frame header')
      }
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
        codec: chunk.trim(),
      }
    }

    if (chunk === 'VP8L') {
      if (data + 5 > buffer.length || buffer[data] !== 0x2f) throw new Error('invalid VP8L frame header')
      const bits = buffer.readUInt32LE(data + 1)
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >> 14) & 0x3fff),
        codec: chunk,
      }
    }

    offset = data + size + (size % 2)
  }

  throw new Error('WEBP image chunk not found')
}

const failures = []
const records = []

if (!existsSync(handoffPath)) failures.push(`Missing provider handoff: ${path.relative(root, handoffPath)}`)
if (!existsSync(registryPath)) failures.push(`Missing runtime asset registry: ${path.relative(root, registryPath)}`)

const handoff = existsSync(handoffPath) ? JSON.parse(readFileSync(handoffPath, 'utf8')) : { assets: [] }
const registry = existsSync(registryPath) ? readFileSync(registryPath, 'utf8') : ''
const entries = Array.isArray(handoff.assets) ? handoff.assets : []
const seen = new Set()

if (handoff.producer !== 'LifeLoggerAI/asset-factory') failures.push(`Unexpected handoff producer: ${handoff.producer || 'missing'}`)
if (handoff.consumer !== 'LifeLoggerAI/urai-spatial') failures.push(`Unexpected handoff consumer: ${handoff.consumer || 'missing'}`)
if (handoff.providerRequired !== true) failures.push('Provider handoff must set providerRequired=true')
if (handoff.ready !== entries.length || handoff.missing !== 0) failures.push('Provider handoff summary does not match its asset records')

for (const entry of entries) {
  const canonicalPath = normalizeCanonicalPath(entry.canonicalPath)
  const safeCanonicalPath = isSafeCanonicalPath(canonicalPath)
  const filePath = safeCanonicalPath ? path.resolve(assetRoot, canonicalPath) : null
  const entryFailures = []

  if (!safeCanonicalPath) entryFailures.push('invalid canonical path')
  if (seen.has(canonicalPath)) entryFailures.push('duplicate canonical path')
  seen.add(canonicalPath)
  if (entry.status !== 'ready') entryFailures.push(`status=${entry.status || 'missing'}`)
  if (entry.renderer !== 'provider') entryFailures.push(`renderer=${entry.renderer || 'missing'}`)
  if (!entry.sourcePath || !entry.promptVersion) entryFailures.push('missing provider source record')
  if (!/^[0-9a-f]{64}$/.test(String(entry.sha256 || ''))) entryFailures.push('invalid expected SHA-256')
  if (!Number.isInteger(entry.bytes) || entry.bytes <= 4096) entryFailures.push('invalid expected byte size')
  if (!Number.isInteger(entry.width) || entry.width <= 0 || !Number.isInteger(entry.height) || entry.height <= 0) entryFailures.push('invalid expected dimensions')

  let actual = null
  if (filePath && !existsSync(filePath)) {
    entryFailures.push('missing committed binary')
  } else if (filePath) {
    const stat = statSync(filePath)
    const buffer = readFileSync(filePath)
    actual = { bytes: stat.size, sha256: sha256(buffer), width: null, height: null, codec: null }
    if (stat.size !== entry.bytes) entryFailures.push(`byte mismatch expected=${entry.bytes} actual=${stat.size}`)
    if (actual.sha256 !== entry.sha256) entryFailures.push(`SHA-256 mismatch expected=${entry.sha256} actual=${actual.sha256}`)
    try {
      const dimensions = readWebpDimensions(buffer)
      Object.assign(actual, dimensions)
      if (dimensions.width !== entry.width || dimensions.height !== entry.height) {
        entryFailures.push(`dimension mismatch expected=${entry.width}x${entry.height} actual=${dimensions.width}x${dimensions.height}`)
      }
    } catch (error) {
      entryFailures.push(`format validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const core = corePaths.has(canonicalPath)
  const registered = safeCanonicalPath && registry.includes(`"/${canonicalPath}"`)
  if (core && !registered) entryFailures.push('core asset is not registered in uraiAssets.ts')

  records.push({
    name: entry.name || null,
    canonicalPath,
    core,
    registered,
    sourcePath: entry.sourcePath || null,
    promptVersion: entry.promptVersion || null,
    expected: { bytes: entry.bytes ?? null, sha256: entry.sha256 || null, width: entry.width ?? null, height: entry.height ?? null },
    actual,
    ok: entryFailures.length === 0,
    failures: entryFailures,
  })

  for (const failure of entryFailures) failures.push(`${canonicalPath || entry.name || 'unknown'}: ${failure}`)
}

for (const corePath of corePaths) {
  if (!seen.has(corePath)) failures.push(`${corePath}: missing from provider handoff`)
}

const coreRecords = records.filter((record) => record.core)
if (coreRecords.length !== corePaths.size) failures.push(`Expected ${corePaths.size} core provider records, found ${coreRecords.length}`)

const routeOwners = routeOwnerChecks.map((check) => {
  const ownerFailures = []
  const sources = []

  for (const file of check.files) {
    const absolute = path.join(root, file)
    if (!existsSync(absolute)) ownerFailures.push(`${file}: active owner file is missing`)
    else sources.push(readFileSync(absolute, 'utf8'))
  }

  const sourceGraph = sources.join('\n')
  if (check.assetSet) {
    if (!sourceGraph.includes(check.assetSet)) ownerFailures.push(`does not import ${check.assetSet}`)
    if (!sourceGraph.includes(`assetCssStack(${check.assetSet}.`)) ownerFailures.push(`does not render ${check.assetSet} through assetCssStack`)
  }

  for (const marker of check.required || []) {
    if (!sourceGraph.includes(marker)) ownerFailures.push(`missing active-owner marker: ${marker}`)
  }

  for (const marker of check.forbidden || []) {
    if (sourceGraph.includes(marker)) ownerFailures.push(`contains retired owner marker: ${marker}`)
  }

  for (const failure of ownerFailures) failures.push(`${check.routes.join(', ')} via ${check.files.join(' + ')}: ${failure}`)
  return { ...check, active: ownerFailures.length === 0, failures: ownerFailures }
})

const report = {
  ok: failures.length === 0,
  schemaVersion: 'urai-provider-asset-verification-5',
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-spatial',
  commit: process.env.GITHUB_SHA || null,
  producer: handoff.producer || null,
  handoffGeneratedAt: handoff.generatedAt || null,
  totalRecords: records.length,
  coreRequired: corePaths.size,
  coreVerified: coreRecords.filter((record) => record.ok).length,
  coreRegistered: coreRecords.filter((record) => record.registered).length,
  providerVerified: records.filter((record) => record.ok).length,
  routeOwnersRequired: routeOwners.length,
  routeOwnersVerified: routeOwners.filter((owner) => owner.active).length,
  routeOwners,
  failures,
  records,
}

mkdirSync(evidenceDirectory, { recursive: true })
writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  ok: report.ok,
  totalRecords: report.totalRecords,
  coreRequired: report.coreRequired,
  coreVerified: report.coreVerified,
  coreRegistered: report.coreRegistered,
  providerVerified: report.providerVerified,
  routeOwnersVerified: `${report.routeOwnersVerified}/${report.routeOwnersRequired}`,
  failureCount: failures.length,
  evidencePath: path.relative(root, evidencePath),
  failures,
}, null, 2))

if (failures.length) process.exitCode = 1
