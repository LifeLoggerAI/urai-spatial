#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const sourcePath = path.join(root, 'operations/assets/sources/home-finalization-authored-source-v2.json')
const decisionsPath = path.join(root, 'operations/assets/home-finalization-candidate-decisions.json')
const summaryPath = path.join(root, 'operations/assets/generated-receipts/forge-summary.json')
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'))
const maps = [
  ['home-entry-chamber-v1', 'home-entry-chamber-current', 'home-entry-chamber-v1.glb'],
  ['portal-ring-master-v1', 'portal-ring-current', 'portal-ring-master-v1.glb'],
  ['urai-orb-avatar-v1', 'urai-orb-avatar-current', 'urai-orb-avatar-v1.glb'],
]

if (source.schemaVersion !== 3 || source.sourceId !== 'urai-home-authored-sanctuary-source-v3') throw new Error('Expected authored source receipt v3')

for (const [assetId, decisionId, fileName] of maps) {
  const filePath = path.join(root, 'urai-tier1/public/assets/urai/generated/models', fileName)
  const receiptPath = path.join(root, 'operations/assets/generated-receipts', `${assetId}.json`)
  const payload = fs.readFileSync(filePath)
  const json = readGlbJson(payload)
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex')
  const compression = json.extensionsUsed?.includes('EXT_meshopt_compression') ? 'meshopt' : 'uncompressed-glb-authored-candidate'
  const sourceEntry = source.assets.find((item) => item.fileName === fileName)
  if (!sourceEntry) throw new Error(`Missing authored source entry for ${fileName}`)

  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  receipt.bytes = payload.length
  receipt.sha256 = sha256
  receipt.measured = {
    ...(receipt.measured || {}),
    triangleCount: sourceEntry.triangleCount,
    boundsMeters: sourceEntry.boundsMeters,
    nodeCount: json.nodes?.length || 0,
    materialCount: json.materials?.length || 0,
    animationClips: (json.animations || []).map((clip) => clip.name),
  }
  receipt.compressionStatus = compression
  receipt.source = 'URAI Labs deterministic authored sanctuary v3 pipeline; replaceable only by a separately reviewed provider asset'
  receipt.license = 'URAI Labs internal proprietary production asset'
  receipt.authoredOwnership = source.ownership
  receipt.authoredLicense = source.license
  receipt.generatedBy = 'scripts/author-home-finalization-assets.mjs v3 + pinned @gltf-transform/cli Meshopt compression + independent validation'
  receipt.authoredSourceReceipt = 'operations/assets/sources/home-finalization-authored-source-v2.json'
  receipt.releaseState = 'candidate-not-production-ready'
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)

  const decision = decisions.decisions.find((item) => item.id === decisionId)
  if (!decision) throw new Error(`Missing decision ${decisionId}`)
  Object.assign(decision, {
    sha256,
    bytes: payload.length,
    triangleCount: sourceEntry.triangleCount,
    boundsMeters: sourceEntry.boundsMeters,
    nodes: json.nodes?.length || 0,
    materials: json.materials?.length || 0,
    textures: json.textures?.length || 0,
    animations: json.animations?.length || 0,
    animationClips: (json.animations || []).map((clip) => clip.name),
    compression,
    validation: 'authored source lock, exact receipt hash, independent GLB audit, Khronos-compatible validation, route evidence and delegated founder visual acceptance still required',
    classification: compression === 'meshopt' ? 'authored compressed review candidate' : 'authored review candidate awaiting compression',
    reason: assetId === 'home-entry-chamber-v1'
      ? 'Authored sanctuary v3 with open mobile-safe sightline, grounded terrain, masonry vaults, natural paths, portal alcoves, environmental growth, authored embodied presence, personalized-place anchors and four Home/presence clips. Remains review-only until exact-head visual acceptance.'
      : assetId === 'portal-ring-master-v1'
        ? 'Authored architectural masonry portal v3 with internal depth, traversal veil, named interaction nodes and seven directly bound state clips. Remains review-only until route-wide visual acceptance.'
        : 'Authored route-independent Orb v3 with layered petals, core, heart, aura, orbital systems and twelve directly bound state clips. Remains review-only until exact-head visual acceptance.',
  })
}

fs.writeFileSync(decisionsPath, `${JSON.stringify(decisions, null, 2)}\n`)

if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  for (const [assetId] of maps) {
    const receipt = JSON.parse(fs.readFileSync(path.join(root, 'operations/assets/generated-receipts', `${assetId}.json`), 'utf8'))
    const entry = summary.assets.find((item) => item.id === assetId)
    if (entry) Object.assign(entry, { bytes: receipt.bytes, sha256: receipt.sha256, measured: receipt.measured })
  }
  summary.totalBytes = summary.assets.reduce((sum, item) => sum + Number(item.bytes || 0), 0)
  summary.authoredHomeAssets = true
  summary.authoredSourceReceipt = 'operations/assets/sources/home-finalization-authored-source-v2.json'
  summary.authoredSourceId = source.sourceId
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
}

console.log(JSON.stringify({ ok: true, sourceId: source.sourceId, updated: maps.map(([id]) => id) }, null, 2))

function readGlbJson(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic')
  if (buffer.readUInt32LE(4) !== 2) throw new Error('Unsupported GLB version')
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim())
}
