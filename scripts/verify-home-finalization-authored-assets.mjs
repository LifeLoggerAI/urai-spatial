#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const source = JSON.parse(fs.readFileSync(path.join(root, 'operations/assets/sources/home-finalization-authored-source-v2.json'), 'utf8'))
const decisions = JSON.parse(fs.readFileSync(path.join(root, 'operations/assets/home-finalization-candidate-decisions.json'), 'utf8'))
const manifestSource = fs.readFileSync(path.join(root, 'urai-tier1/src/spatial/assets/assetManifest.ts'), 'utf8')
const runtimeSource = fs.readFileSync(path.join(root, 'urai-tier1/src/app/AssetDrivenHomeWorld.tsx'), 'utf8')
const errors = []
const contracts = [
  {
    assetId: 'home-entry-chamber-v1', fileName: 'home-entry-chamber-v1.glb', decisionId: 'home-entry-chamber-current',
    minNodes: 120, requiredClips: ['Home_Breathing','Presence_Idle','Presence_Privacy','Presence_Forming'], manifestId: 'home-entry-chamber-model-v1', maxTriangles: 180000,
    requiredNodes: ['home-sanctuary-root','sanctuary-terrain','ground-descent-path','life-map-ascent-path','mirror-basin-water','ground-alcove-root','life-map-alcove-root','horizon-threshold-root','embodied-presence-root','embodied-presence-cloak-back','embodied-presence-face-light','memory-place-anchor-1'],
  },
  {
    assetId: 'portal-ring-master-v1', fileName: 'portal-ring-master-v1.glb', decisionId: 'portal-ring-current',
    minNodes: 40, requiredClips: ['Portal_Closed','Portal_Available','Portal_Attention','Portal_Active','Portal_Opening','Portal_Traversal','Portal_Closing'], manifestId: 'portal-ring-master-glb-v1', maxTriangles: 24000,
    requiredNodes: ['portal-root','portal-pillar-left','portal-pillar-right','portal-architectural-arch','portal-membrane','portal-inner-veil','portal-depth-1','portal-threshold-stone'],
  },
  {
    assetId: 'urai-orb-avatar-v1', fileName: 'urai-orb-avatar-v1.glb', decisionId: 'urai-orb-avatar-current',
    minNodes: 20, requiredClips: ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition'], manifestId: 'urai-orb-avatar-glb-v1', maxTriangles: 30000,
    requiredNodes: ['orb-root','orb-core','orb-heart','orb-aura','orb-petal-1','orb-orbit-a','orb-orbit-b','orb-orbit-c'],
  },
]

if (source.schemaVersion !== 3 || source.sourceId !== 'urai-home-authored-sanctuary-source-v3') errors.push('authored source receipt must be schema v3')
if (decisions.truthBoundary?.manifestPromotion !== false || decisions.truthBoundary?.visualApproval !== false || decisions.truthBoundary?.productionReady !== false) errors.push('truth boundary must remain unpromoted, visually unapproved and not production ready')
if (decisions.truthBoundary?.reviewModeRequired !== true) errors.push('review mode must remain required')

for (const marker of [
  'HomeSanctuaryWorld',
  'useAnimations',
  'data-home-animation-owner="authored-sanctuary-plus-gltf-interactions"',
  'data-home-orb-clip=',
  'Portal_Opening',
  'Portal_Traversal',
  'Portal_Closing',
]) {
  if (!runtimeSource.includes(marker)) errors.push(`runtime sanctuary or authored interaction binding missing: ${marker}`)
}
for (const forbidden of ['data-home-animation-owner="gltf-authored-clips"', 'latheGeometry', 'torusKnotGeometry', 'home-candidate-orb', 'Review candidate composition — visually improved, still unapproved.']) {
  if (runtimeSource.includes(forbidden)) errors.push(`retired procedural or rejected visual marker remains: ${forbidden}`)
}

for (const contract of contracts) {
  const filePath = path.join(root, 'urai-tier1/public/assets/urai/generated/models', contract.fileName)
  const payload = fs.readFileSync(filePath)
  const json = readGlbJson(payload)
  const receipt = JSON.parse(fs.readFileSync(path.join(root, 'operations/assets/generated-receipts', `${contract.assetId}.json`), 'utf8'))
  const decision = decisions.decisions.find((item) => item.id === contract.decisionId)
  const sourceEntry = source.assets.find((item) => item.fileName === contract.fileName)
  const hash = crypto.createHash('sha256').update(payload).digest('hex')
  const nodeNames = new Set((json.nodes || []).map((node) => node.name))
  const clipNames = new Set((json.animations || []).map((clip) => clip.name))

  if (hash !== receipt.sha256 || hash !== decision?.sha256) errors.push(`${contract.assetId}: file, receipt and decision hashes differ`)
  if (payload.length !== receipt.bytes || payload.length !== decision?.bytes) errors.push(`${contract.assetId}: file, receipt and decision bytes differ`)
  if (!json.extensionsUsed?.includes('EXT_meshopt_compression')) errors.push(`${contract.assetId}: Meshopt compression extension missing`)
  if ((json.nodes?.length || 0) < contract.minNodes) errors.push(`${contract.assetId}: insufficient named node structure`)
  for (const name of contract.requiredNodes) if (!nodeNames.has(name)) errors.push(`${contract.assetId}: missing named node ${name}`)
  for (const clip of contract.requiredClips) if (!clipNames.has(clip)) errors.push(`${contract.assetId}: missing animation clip ${clip}`)
  if ((sourceEntry?.triangleCount || Infinity) > contract.maxTriangles) errors.push(`${contract.assetId}: triangle budget exceeded`)
  if (receipt.compressionStatus !== 'meshopt' || decision?.compression !== 'meshopt') errors.push(`${contract.assetId}: receipt and decision must record meshopt`)
  const manifestStart = manifestSource.indexOf(`id: '${contract.manifestId}'`)
  if (manifestStart < 0) errors.push(`${contract.assetId}: canonical manifest entry missing`)
  else if (!/status: 'future'/.test(manifestSource.slice(manifestStart, manifestStart + 800))) errors.push(`${contract.assetId}: canonical manifest was promoted before visual acceptance`)
}

const report = { ok: errors.length === 0, sourceId: source.sourceId, checked: contracts.map(({ assetId }) => assetId), errors }
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exit(1)

function readGlbJson(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic')
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim())
}
