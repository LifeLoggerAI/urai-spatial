#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_ROOT = process.cwd()
const CANONICAL_MANIFEST = 'operations/assets/launch-critical-assets.json'
const RUNTIME_MANIFEST = 'urai-tier1/src/spatial/assets/assetManifest.ts'
const SENSORY_RUNTIME_MANIFEST = 'urai-tier1/src/spatial/assets/sensoryAssetManifest.ts'
const PROMOTION_STATE = 'urai-tier1/src/spatial/assets/assetPromotionState.ts'
const HISTORICAL_LEDGER = 'docs/release-evidence/SPATIAL_ASSET_COMPLETION_LEDGER_2026-08-01.json'
const AUTHORITY_SUPERSESSIONS = 'operations/assets/authority-supersessions'

const ROUTE_OWNERS = Object.freeze({
  '/': 'urai-tier1/src/spatial/layout/HomeWorldProductionSacred.tsx',
  '/home': 'urai-tier1/src/spatial/layout/HomeWorldProductionSacred.tsx',
  '/ground': 'urai-tier1/src/app/GroundSpatialWorldClean.tsx',
  '/life-map': 'urai-tier1/src/components/lifemap/LifeMapProductionWorld.tsx',
  '/focus': 'urai-tier1/src/app/focus/FocusChamberClient.tsx',
  '/replay': 'urai-tier1/src/app/replay/CinematicReplayClient.tsx',
  '/passport': 'urai-tier1/src/app/passport/PassportVaultClient.tsx',
  '/council': 'urai-tier1/src/spatial/council/CouncilRealm.tsx',
})

function readText(root, relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

function readJson(root, relative) {
  return JSON.parse(readText(root, relative))
}

function sha256(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex')
}

function constructorStatus(source, constructorName) {
  const start = source.indexOf(`const ${constructorName}`)
  if (start < 0) return null
  const candidates = [
    source.indexOf('\nconst ', start + 1),
    source.indexOf('\nexport const ', start + 1),
  ].filter((index) => index > start)
  const end = candidates.length ? Math.min(...candidates) : source.length
  return source.slice(start, end).match(/\bstatus:\s*'([^']+)'/)?.[1] ?? null
}

function runtimeAssetEntries(source) {
  const entries = new Map()
  for (const constructorName of ['finalGlb', 'pendingHuman']) {
    const status = constructorStatus(source, constructorName)
    const expression = new RegExp(`${constructorName}\\(\\s*'([^']+)'\\s*,\\s*'[^']*'\\s*,\\s*'([^']+)'`, 'g')
    for (const match of source.matchAll(expression)) {
      entries.set(match[1], { fileName: match[2], status })
    }
  }
  return entries
}

function promotedIds(source) {
  const body = source.match(/uraiPromotedAssetIds\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
  return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

export function canonicalRuntimeStatusErrors({ canonicalAssets, runtimeManifestSource, promotionStateSource }) {
  const errors = []
  const byFile = new Map(canonicalAssets.map((asset) => [path.basename(asset.fixedPath), asset]))
  const entries = runtimeAssetEntries(runtimeManifestSource)

  for (const [runtimeId, entry] of entries) {
    const canonical = byFile.get(entry.fileName)
    if (!canonical) continue
    if (canonical.releaseState === 'pending-final-review' && entry.status === 'ready') {
      errors.push(`${canonical.id}: canonical pending asset is runtime-ready as ${runtimeId}`)
    }
  }

  for (const runtimeId of promotedIds(promotionStateSource)) {
    const entry = entries.get(runtimeId)
    const canonical = entry ? byFile.get(entry.fileName) : null
    if (!canonical) {
      errors.push(`${runtimeId}: promoted runtime id has no canonical launch asset mapping`)
    } else if (canonical.releaseState !== 'production-ready') {
      errors.push(`${canonical.id}: ${canonical.releaseState} asset is hard-coded promoted as ${runtimeId}`)
    }
  }

  return errors
}

export function sensoryRuntimeStatusErrors({ canonicalAssets, sensoryManifestSource }) {
  const errors = []
  const canonicalById = new Map(canonicalAssets.map((asset) => [asset.id, asset]))
  for (const match of sensoryManifestSource.matchAll(/id:\s*'([^']+)'[\s\S]*?status:\s*'([^']+)'/g)) {
    const runtimeId = match[1]
    const status = match[2]
    const canonical = canonicalById.get(runtimeId)
    if (status === 'ready' && !canonical) {
      errors.push(`${runtimeId}: ready sensory asset has no canonical launch asset mapping`)
    } else if (canonical?.releaseState === 'pending-final-review' && status === 'ready') {
      errors.push(`${canonical.id}: canonical pending sensory asset is runtime-ready`)
    }
  }
  return errors
}

export function inspectGlb(payload) {
  if (payload.length < 20 || payload.toString('utf8', 0, 4) !== 'glTF') throw new Error('invalid GLB magic')
  if (payload.readUInt32LE(4) !== 2) throw new Error('GLB must be glTF 2.0')
  if (payload.readUInt32LE(8) !== payload.length) throw new Error('GLB length mismatch')
  const jsonLength = payload.readUInt32LE(12)
  const json = JSON.parse(payload.subarray(20, 20 + jsonLength).toString('utf8').trim())
  let triangleCount = 0
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = primitive.indices === undefined
        ? json.accessors?.[primitive.attributes?.POSITION]
        : json.accessors?.[primitive.indices]
      if (!accessor) throw new Error('GLB primitive accessor missing')
      const mode = primitive.mode ?? 4
      if (mode === 4) triangleCount += Math.floor(accessor.count / 3)
      else if (mode === 5 || mode === 6) triangleCount += Math.max(0, accessor.count - 2)
      else throw new Error(`unsupported GLB primitive mode ${mode}`)
    }
  }
  return {
    triangleCount,
    nodeCount: json.nodes?.length ?? 0,
    materialCount: json.materials?.length ?? 0,
    animationClips: (json.animations ?? []).map((animation) => animation.name).filter(Boolean),
  }
}

export function generatedReceiptErrors({ asset, receipt, payload }) {
  const errors = []
  const label = asset.id
  if (receipt.id !== asset.id) errors.push(`${label}: generated receipt id mismatch`)
  if (receipt.fixedPath !== asset.fixedPath) errors.push(`${label}: generated receipt path mismatch`)
  if (receipt.bytes !== payload.length) errors.push(`${label}: generated receipt byte count drift`)
  if (receipt.sha256 !== sha256(payload)) errors.push(`${label}: generated receipt SHA-256 drift`)
  if (asset.kind !== 'model') return errors

  let actual
  try {
    actual = inspectGlb(payload)
  } catch (error) {
    errors.push(`${label}: ${error.message}`)
    return errors
  }
  const measured = receipt.measured ?? {}
  for (const key of ['triangleCount', 'nodeCount', 'materialCount']) {
    if (measured[key] !== undefined && measured[key] !== actual[key]) {
      errors.push(`${label}: generated receipt ${key} ${measured[key]} != parsed ${actual[key]}`)
    }
  }
  if (Array.isArray(measured.animationClips)) {
    const expected = [...measured.animationClips].sort()
    const parsed = [...actual.animationClips].sort()
    if (JSON.stringify(expected) !== JSON.stringify(parsed)) {
      errors.push(`${label}: generated receipt animation clips contradict parsed GLB`)
    }
  }
  return errors
}

export function productionEvidenceErrors({ asset, evidence, payload, evidencePath }) {
  const errors = []
  if (asset.releaseState !== 'production-ready') {
    errors.push(`${evidencePath}: current production evidence exists for ${asset.releaseState} asset ${asset.id}`)
  }
  if (evidence.bytes !== payload.length) errors.push(`${evidencePath}: current binary byte count drift`)
  if (evidence.sha256 !== sha256(payload)) errors.push(`${evidencePath}: current binary SHA-256 drift`)
  return errors
}

export function authoritySupersessionErrors({ root, documents }) {
  const errors = []
  const supersededPaths = new Set()
  for (const { relativePath, document } of documents) {
    if (document.schemaVersion !== 'urai-asset-authority-supersession-1') {
      errors.push(`${relativePath}: unsupported authority supersession schema`)
      continue
    }
    if (document.status !== 'historical-superseded' || document.currentAuthority !== false) {
      errors.push(`${relativePath}: supersession must explicitly deny current authority`)
    }
    for (const record of document.records ?? []) {
      if (!record.path || !record.sha256) {
        errors.push(`${relativePath}: superseded record must bind path and SHA-256`)
        continue
      }
      if (supersededPaths.has(record.path)) {
        errors.push(`${relativePath}: duplicate supersession for ${record.path}`)
        continue
      }
      const absolute = path.join(root, record.path)
      if (!fs.existsSync(absolute)) {
        errors.push(`${relativePath}: superseded record is missing: ${record.path}`)
        continue
      }
      if (sha256(fs.readFileSync(absolute)) !== record.sha256) {
        errors.push(`${relativePath}: immutable record hash drift for ${record.path}`)
        continue
      }
      supersededPaths.add(record.path)
    }
  }
  return { errors, supersededPaths }
}

export function currentProductionEvidenceErrors({ canonicalAssets, currentDecisions, currentReceipts }) {
  const errors = []
  for (const asset of canonicalAssets.filter((candidate) => candidate.releaseState === 'production-ready')) {
    if (!currentDecisions.has(asset.id)) {
      errors.push(`${asset.id}: production-ready asset has no matching current promotion decision`)
    }
    if (!currentReceipts.has(asset.id)) {
      errors.push(`${asset.id}: production-ready asset has no matching current production receipt`)
    }
  }
  return errors
}

export function routeConsumptionErrors({ asset, evidence, root, runtimeManifestSource = '', routeOwners = ROUTE_OWNERS }) {
  if (evidence.routeConsumptionVerified !== true) return []
  const errors = []
  const fileName = path.basename(asset.fixedPath)
  const runtimeId = [...runtimeAssetEntries(runtimeManifestSource)].find(([, entry]) => entry.fileName === fileName)?.[0] ?? null
  for (const route of asset.targetRoutes ?? []) {
    const ownerPath = routeOwners[route]
    if (!ownerPath) {
      errors.push(`${asset.id}: no active route owner is registered for claimed route ${route}`)
      continue
    }
    const absolute = path.join(root, ownerPath)
    if (!fs.existsSync(absolute) || ![fileName, runtimeId].filter(Boolean).some((token) => fs.readFileSync(absolute, 'utf8').includes(token))) {
      errors.push(`${asset.id}: claimed route ${route} owner ${ownerPath} does not consume ${fileName}`)
    }
  }
  return errors
}

function listJson(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory).filter((file) => file.endsWith('.json')).sort()
}

export function collectAuthorityErrors(root = DEFAULT_ROOT) {
  const errors = []
  const manifest = readJson(root, CANONICAL_MANIFEST)
  const canonicalAssets = manifest.assets ?? []
  const byId = new Map(canonicalAssets.map((asset) => [asset.id, asset]))
  const runtimeManifestSource = readText(root, RUNTIME_MANIFEST)
  errors.push(...canonicalRuntimeStatusErrors({
    canonicalAssets,
    runtimeManifestSource,
    promotionStateSource: readText(root, PROMOTION_STATE),
  }))
  errors.push(...sensoryRuntimeStatusErrors({
    canonicalAssets,
    sensoryManifestSource: readText(root, SENSORY_RUNTIME_MANIFEST),
  }))

  const supersessionDocuments = listJson(path.join(root, AUTHORITY_SUPERSESSIONS)).map((file) => {
    const relativePath = path.join(AUTHORITY_SUPERSESSIONS, file)
    return { relativePath, document: readJson(root, relativePath) }
  })
  const supersessions = authoritySupersessionErrors({ root, documents: supersessionDocuments })
  errors.push(...supersessions.errors)

  const ledger = readJson(root, HISTORICAL_LEDGER)
  if ((ledger.summary?.launchCriticalModels?.promoted ?? 0) > 0 && !supersessions.supersededPaths.has(HISTORICAL_LEDGER)) {
    errors.push(`${HISTORICAL_LEDGER}: promoted summary must be explicitly historical when canonical assets are pending`)
  }

  for (const asset of canonicalAssets) {
    const payload = fs.readFileSync(path.join(root, asset.fixedPath))
    const receiptPath = path.join(manifest.receiptRoot, `${asset.id}.json`)
    const receipt = readJson(root, receiptPath)
    errors.push(...generatedReceiptErrors({ asset, receipt, payload }))
  }

  const currentDecisions = new Set()
  const currentReceipts = new Set()
  for (const relativeDirectory of ['operations/assets/promotion-decisions', 'operations/assets/production-receipts']) {
    const directory = path.join(root, relativeDirectory)
    for (const file of listJson(directory)) {
      const relative = path.join(relativeDirectory, file)
      const evidence = readJson(root, relative)
      const asset = byId.get(evidence.assetId) ?? byId.get(evidence.id)
      if (!asset || evidence.fixedPath !== asset.fixedPath && evidence.canonicalPath !== asset.fixedPath) continue
      const isSuperseded = supersessions.supersededPaths.has(relative)
      if (!isSuperseded) {
        if (relativeDirectory.endsWith('promotion-decisions')) currentDecisions.add(asset.id)
        else currentReceipts.add(asset.id)
      }
      if (isSuperseded) continue
      const payload = fs.readFileSync(path.join(root, asset.fixedPath))
      errors.push(...productionEvidenceErrors({ asset, evidence, payload, evidencePath: relative }))
      errors.push(...routeConsumptionErrors({ asset, evidence, root, runtimeManifestSource }))
    }
  }
  errors.push(...currentProductionEvidenceErrors({ canonicalAssets, currentDecisions, currentReceipts }))
  return errors
}

function main() {
  const errors = collectAuthorityErrors(DEFAULT_ROOT)
  if (errors.length) {
    console.error('ASSET_AUTHORITY_CONSISTENCY=RED')
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }
  const manifest = readJson(DEFAULT_ROOT, CANONICAL_MANIFEST)
  console.log('ASSET_AUTHORITY_CONSISTENCY=GREEN')
  console.log(`CANONICAL_ASSETS_CHECKED=${manifest.assets.length}`)
  console.log('PRODUCTION_PROMOTIONS=0')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
