#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const manifestPath = path.join(
  repositoryRoot,
  'urai-tier1/public/assets/urai/final/manifests/asset-factory-spatial-handoff.json',
)
const sourceRoot = path.join(repositoryRoot, 'urai-tier1/src')

const argumentsSet = new Set(process.argv.slice(2))
const checkMode = argumentsSet.has('--check')
const outputPath = argumentValue('--out')
  ?? path.join(repositoryRoot, 'artifacts/asset-pack-independent-ledger.json')
const csvPath = argumentValue('--csv')
  ?? path.join(repositoryRoot, 'artifacts/asset-pack-independent-ledger.csv')

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : null
}

function fail(message) {
  throw new Error(message)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30) fail('WebP file is too small')
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    fail('File does not contain a RIFF WebP header')
  }

  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const dataOffset = offset + 8

    if (chunkType === 'VP8X' && dataOffset + 10 <= buffer.length) {
      return {
        width: readUInt24LE(buffer, dataOffset + 4) + 1,
        height: readUInt24LE(buffer, dataOffset + 7) + 1,
        encoding: 'VP8X',
      }
    }

    if (chunkType === 'VP8 ' && dataOffset + 10 <= buffer.length) {
      const signature = buffer.subarray(dataOffset + 3, dataOffset + 6)
      if (signature[0] === 0x9d && signature[1] === 0x01 && signature[2] === 0x2a) {
        return {
          width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
          encoding: 'VP8',
        }
      }
    }

    if (chunkType === 'VP8L' && dataOffset + 5 <= buffer.length && buffer[dataOffset] === 0x2f) {
      const bits = buffer.readUInt32LE(dataOffset + 1)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
        encoding: 'VP8L',
      }
    }

    offset = dataOffset + chunkSize + (chunkSize % 2)
  }

  fail('WebP dimensions could not be resolved')
}

function walk(directory, acceptedExtensions = null) {
  if (!fs.existsSync(directory)) return []
  const results = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      results.push(...walk(absolutePath, acceptedExtensions))
      continue
    }
    if (!acceptedExtensions || acceptedExtensions.has(path.extname(entry.name).toLowerCase())) {
      results.push(absolutePath)
    }
  }
  return results
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function categoryOwner(category) {
  const normalized = String(category || '').toLowerCase()
  if (normalized.startsWith('home')) return '/home'
  if (normalized.startsWith('ground')) return '/ground'
  if (normalized.startsWith('life_map')) return '/life-map'
  if (normalized.startsWith('focus')) return '/focus'
  if (normalized.startsWith('replay')) return '/replay'
  if (normalized.startsWith('mirror')) return '/mirror'
  if (normalized.startsWith('passport')) return '/passport'
  if (normalized.startsWith('privacy')) return '/privacy-controls'
  if (normalized.startsWith('location')) return '/location-map'
  if (normalized.startsWith('status')) return '/status'
  if (normalized.startsWith('avatar')) return 'shared:avatar'
  if (normalized.startsWith('orb') || normalized.startsWith('ui')) return 'shared:ui'
  if (normalized.startsWith('social') || normalized.startsWith('og')) return 'shared:social'
  return `unclassified:${normalized || 'unknown'}`
}

function routeFromSourcePath(relativePath) {
  const normalized = normalizePath(relativePath)
  const appMatch = normalized.match(/urai-tier1\/src\/app\/([^/]+)/)
  if (appMatch) return `/${appMatch[1]}`
  if (normalized.includes('/components/lifemap/') || normalized.includes('/spatial/lifemap/')) return '/life-map'
  if (normalized.includes('/app/ground/') || normalized.includes('GroundSpatial')) return '/ground'
  if (normalized.includes('/app/home') || normalized.includes('HomeSpatial')) return '/home'
  if (normalized.includes('/spatial/assets/uraiAssets.ts')) return 'asset-registry'
  return 'shared-runtime'
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

const manifest = readJson(manifestPath)
if (!Array.isArray(manifest.assets)) fail('Manifest does not contain an assets array')

const copyRoot = path.resolve(repositoryRoot, manifest.copyRoot)
if (!copyRoot.startsWith(repositoryRoot)) fail('Manifest copyRoot escapes repository root')

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.json', '.md'])
const sourceFiles = walk(sourceRoot, sourceExtensions)
const sourceIndex = sourceFiles.map((absolutePath) => ({
  absolutePath,
  relativePath: normalizePath(path.relative(repositoryRoot, absolutePath)),
  content: fs.readFileSync(absolutePath, 'utf8'),
}))

const duplicateNames = new Map()
const duplicatePaths = new Map()
const duplicateHashes = new Map()
const records = []

for (const asset of manifest.assets) {
  const canonicalPath = normalizePath(asset.canonicalPath)
  const absolutePath = path.resolve(copyRoot, canonicalPath)
  const insideCopyRoot = absolutePath.startsWith(`${copyRoot}${path.sep}`)
  const exists = insideCopyRoot && fs.existsSync(absolutePath)
  const buffer = exists ? fs.readFileSync(absolutePath) : null
  const actualBytes = buffer?.length ?? null
  const actualSha256 = buffer ? sha256(buffer) : null

  let dimensions = null
  let dimensionError = null
  if (buffer) {
    try {
      dimensions = readWebpDimensions(buffer)
    } catch (error) {
      dimensionError = error instanceof Error ? error.message : String(error)
    }
  }

  const publicUrl = `/${canonicalPath}`
  const basename = path.basename(canonicalPath)
  const sourceMatches = sourceIndex.filter(({ content }) => content.includes(publicUrl) || content.includes(basename))
  const directMatches = sourceMatches.filter(({ relativePath }) => !relativePath.endsWith('/uraiAssets.ts'))
  const registryMatches = sourceMatches.filter(({ relativePath }) => relativePath.endsWith('/uraiAssets.ts'))
  const consumedBy = [...new Set(sourceMatches.map(({ relativePath }) => relativePath))].sort()
  const observedRouteOwners = [...new Set(sourceMatches.map(({ relativePath }) => routeFromSourcePath(relativePath)))].sort()

  const checks = {
    insideCopyRoot,
    exists,
    statusReady: asset.status === 'ready',
    bytesMatch: actualBytes === asset.bytes,
    sha256Match: actualSha256 === asset.sha256,
    widthMatch: dimensions?.width === asset.width,
    heightMatch: dimensions?.height === asset.height,
    dimensionsReadable: Boolean(dimensions) && !dimensionError,
  }

  const technicalPass = Object.values(checks).every(Boolean)
  const consumption = directMatches.length > 0
    ? 'direct-runtime-reference'
    : registryMatches.length > 0
      ? 'registered-runtime-asset'
      : 'manifest-only-no-source-reference'

  const record = {
    name: asset.name,
    category: asset.category,
    expectedRouteOwner: categoryOwner(asset.category),
    canonicalPath,
    publicUrl,
    sourcePath: asset.sourcePath,
    status: asset.status,
    renderer: asset.renderer,
    promptVersion: asset.promptVersion,
    alpha: asset.alpha,
    expected: {
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
      bytes: asset.bytes,
      sha256: asset.sha256,
    },
    actual: {
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      webpEncoding: dimensions?.encoding ?? null,
      bytes: actualBytes,
      sha256: actualSha256,
      dimensionError,
    },
    checks,
    technicalPass,
    consumption,
    consumedBy,
    observedRouteOwners,
    independentVisualDecision: 'pending-human-route-visual-review',
    promotionAuthorized: false,
    promotionReason: 'Technical manifest verification never grants independent visual or production promotion authority.',
  }

  records.push(record)

  duplicateNames.set(asset.name, [...(duplicateNames.get(asset.name) ?? []), canonicalPath])
  duplicatePaths.set(canonicalPath, [...(duplicatePaths.get(canonicalPath) ?? []), asset.name])
  if (asset.sha256) duplicateHashes.set(asset.sha256, [...(duplicateHashes.get(asset.sha256) ?? []), asset.name])
}

const repeated = (map) => [...map.entries()]
  .filter(([, values]) => values.length > 1)
  .map(([key, values]) => ({ key, values }))

const technicalFailures = records.filter((record) => !record.technicalPass)
const manifestOnly = records.filter((record) => record.consumption === 'manifest-only-no-source-reference')
const directRuntime = records.filter((record) => record.consumption === 'direct-runtime-reference')
const registryOwned = records.filter((record) => record.consumption === 'registered-runtime-asset')

const report = {
  schema: 'urai.asset-pack-independent-ledger.v1',
  generatedAt: new Date().toISOString(),
  repository: 'LifeLoggerAI/urai-spatial',
  repositoryRoot: '.',
  manifest: {
    path: normalizePath(path.relative(repositoryRoot, manifestPath)),
    schemaVersion: manifest.schemaVersion,
    generatedAt: manifest.generatedAt,
    version: manifest.version,
    producer: manifest.producer,
    consumer: manifest.consumer,
    ready: manifest.ready,
    missing: manifest.missing,
    declaredAssets: manifest.assets.length,
    providerRequired: manifest.providerRequired,
  },
  policy: {
    providerCallsMade: 0,
    providerSpendUsd: 0,
    productionDeploymentPerformed: false,
    promotionAuthorized: false,
    truthBoundary: 'This ledger verifies repository bytes and source references. It does not grant independent visual approval, provider authority, or production promotion.',
  },
  summary: {
    technicalPass: technicalFailures.length === 0,
    technicalPassCount: records.length - technicalFailures.length,
    technicalFailureCount: technicalFailures.length,
    directRuntimeReferenceCount: directRuntime.length,
    registeredRuntimeAssetCount: registryOwned.length,
    manifestOnlyCount: manifestOnly.length,
    duplicateNameGroups: repeated(duplicateNames).length,
    duplicateCanonicalPathGroups: repeated(duplicatePaths).length,
    duplicateHashGroups: repeated(duplicateHashes).length,
    pendingHumanVisualDecisions: records.length,
    promotionAuthorizedCount: 0,
  },
  duplicates: {
    names: repeated(duplicateNames),
    canonicalPaths: repeated(duplicatePaths),
    hashes: repeated(duplicateHashes),
  },
  failures: technicalFailures.map((record) => ({
    name: record.name,
    canonicalPath: record.canonicalPath,
    checks: record.checks,
    actual: record.actual,
  })),
  manifestOnly: manifestOnly.map((record) => ({
    name: record.name,
    category: record.category,
    canonicalPath: record.canonicalPath,
    expectedRouteOwner: record.expectedRouteOwner,
  })),
  assets: records,
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)

const csvHeader = [
  'name',
  'category',
  'expectedRouteOwner',
  'canonicalPath',
  'status',
  'technicalPass',
  'widthMatch',
  'heightMatch',
  'bytesMatch',
  'sha256Match',
  'consumption',
  'observedRouteOwners',
  'consumedBy',
  'independentVisualDecision',
  'promotionAuthorized',
]
const csvRows = records.map((record) => [
  record.name,
  record.category,
  record.expectedRouteOwner,
  record.canonicalPath,
  record.status,
  record.technicalPass,
  record.checks.widthMatch,
  record.checks.heightMatch,
  record.checks.bytesMatch,
  record.checks.sha256Match,
  record.consumption,
  record.observedRouteOwners,
  record.consumedBy,
  record.independentVisualDecision,
  record.promotionAuthorized,
])
fs.mkdirSync(path.dirname(csvPath), { recursive: true })
fs.writeFileSync(csvPath, `${[csvHeader, ...csvRows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`)

const checkFailures = []
if (manifest.assets.length !== 53) checkFailures.push(`Expected exactly 53 assets; found ${manifest.assets.length}.`)
if (manifest.ready !== 53) checkFailures.push(`Manifest ready count is ${manifest.ready}; expected 53.`)
if (manifest.missing !== 0) checkFailures.push(`Manifest missing count is ${manifest.missing}; expected 0.`)
if (technicalFailures.length > 0) checkFailures.push(`${technicalFailures.length} assets failed byte/hash/dimension verification.`)
if (repeated(duplicateNames).length > 0) checkFailures.push('Duplicate asset names detected.')
if (repeated(duplicatePaths).length > 0) checkFailures.push('Duplicate canonical paths detected.')

console.log(JSON.stringify({
  ok: checkFailures.length === 0,
  outputPath: normalizePath(path.relative(repositoryRoot, outputPath)),
  csvPath: normalizePath(path.relative(repositoryRoot, csvPath)),
  summary: report.summary,
  checkFailures,
}, null, 2))

if (checkMode && checkFailures.length > 0) process.exitCode = 1
