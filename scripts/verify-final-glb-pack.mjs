#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const modelRoot = path.join(root, 'urai-tier1/public/assets/urai/generated/models')
const receiptPath = path.join(root, 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json')
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))

const contracts = {
  'home-entry-chamber-v1.glb': {
    minNodes: 150,
    maxTriangles: 180000,
    nodes: ['home-sanctuary-root','sanctuary-terrain','mirror-basin-water','ground-alcove-root','life-map-alcove-root','horizon-threshold-root','embodied-presence-root','embodied-presence-cloak-back','embodied-presence-face-light','memory-place-anchor-1'],
    clips: ['Home_Breathing','Presence_Idle','Presence_Privacy','Presence_Forming'],
  },
  'portal-ring-master-v1.glb': {
    minNodes: 40,
    maxTriangles: 24000,
    nodes: ['portal-root','portal-pillar-left','portal-pillar-right','portal-architectural-arch','portal-membrane','portal-inner-veil','portal-depth-1','portal-threshold-stone'],
    clips: ['Portal_Closed','Portal_Available','Portal_Attention','Portal_Active','Portal_Opening','Portal_Traversal','Portal_Closing'],
  },
  'ground-world-terrain-v1.glb': {
    minNodes: 110,
    maxTriangles: 120000,
    nodes: ['ground-world-root','ground-sacred-black-glass','ground-central-nexus','nexus-core','ground-destination-council','ground-destination-passport'],
    clips: ['Ground_Pulse','Nexus_Idle','Chamber_Attention'],
  },
  'life-map-memory-star-v1.glb': {
    minNodes: 30,
    maxTriangles: 40000,
    nodes: ['memory-star-root','memory-star-core','memory-star-heart','memory-star-orbit-1','memory-star-shard-1','memory-star-halo'],
    clips: ['MemoryStar_Idle','MemoryStar_Selected','MemoryStar_Focus'],
  },
  'focus-memory-chamber-v1.glb': {
    minNodes: 34,
    maxTriangles: 50000,
    nodes: ['focus-memory-chamber-root','focus-tunnel-ring-1','focus-memory-cradle','focus-cradle-core','focus-memory-rune-1'],
    clips: ['Focus_Arrival','Focus_Breathing','Focus_Exit'],
  },
  'replay-memory-environment-v1.glb': {
    minNodes: 60,
    maxTriangles: 50000,
    nodes: ['replay-memory-environment-root','replay-film-portal','replay-film-veil','replay-memory-panel-1','replay-camera-track'],
    clips: ['Replay_Idle','Replay_Enter','Replay_Play','Replay_Exit'],
  },
  'urai-orb-avatar-v1.glb': {
    minNodes: 24,
    maxTriangles: 30000,
    nodes: ['orb-root','orb-core','orb-heart','orb-aura','orb-petal-1','orb-orbit-a','orb-orbit-b','orb-orbit-c'],
    clips: ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition'],
  },
  'passport-status-room-v1.glb': {
    minNodes: 40,
    maxTriangles: 50000,
    nodes: ['passport-status-room-root','passport-status-floor','passport-identity-plinth','passport-identity-core','passport-privacy-vault','privacy-vault-seal','status-pod-1'],
    clips: ['Passport_Idle','Passport_Grant','Status_Pulse','Privacy_Lock'],
  },
}

const errors = []
if (receipt.packId !== 'urai-final-glb-production-pack-v1') errors.push('final GLB receipt packId is invalid')
if (receipt.assets?.length !== Object.keys(contracts).length) errors.push('final GLB receipt must contain all eight assets')

for (const [fileName, contract] of Object.entries(contracts)) {
  const record = receipt.assets?.find((asset) => asset.fileName === fileName)
  const filePath = path.join(modelRoot, fileName)
  if (!record) { errors.push(`${fileName}: receipt missing`); continue }
  if (!fs.existsSync(filePath)) { errors.push(`${fileName}: binary missing`); continue }
  const payload = fs.readFileSync(filePath)
  if (payload.readUInt32LE(0) !== 0x46546c67) { errors.push(`${fileName}: invalid GLB magic`); continue }
  if (payload.readUInt32LE(4) !== 2) errors.push(`${fileName}: must be glTF 2.0`)
  if (payload.readUInt32LE(8) !== payload.length) errors.push(`${fileName}: header length mismatch`)
  const jsonLength = payload.readUInt32LE(12)
  const json = JSON.parse(payload.subarray(20, 20 + jsonLength).toString('utf8').trim())
  const hash = crypto.createHash('sha256').update(payload).digest('hex')
  const nodes = new Set((json.nodes || []).map((node) => node.name))
  const clips = new Set((json.animations || []).map((clip) => clip.name))
  if (hash !== record.sha256) errors.push(`${fileName}: receipt hash mismatch`)
  if (payload.length !== record.bytes) errors.push(`${fileName}: receipt byte count mismatch`)
  if ((json.nodes?.length || 0) < contract.minNodes) errors.push(`${fileName}: insufficient named scene structure`)
  if ((record.triangleCount || Infinity) > contract.maxTriangles) errors.push(`${fileName}: triangle budget exceeded`)
  for (const node of contract.nodes) if (!nodes.has(node)) errors.push(`${fileName}: missing node ${node}`)
  for (const clip of contract.clips) if (!clips.has(clip)) errors.push(`${fileName}: missing clip ${clip}`)
  for (const extension of ['KHR_materials_emissive_strength','KHR_materials_transmission','KHR_materials_clearcoat']) {
    if (!json.extensionsUsed?.includes(extension)) errors.push(`${fileName}: missing material extension ${extension}`)
  }
  if (json.asset?.generator !== 'URAI Labs Final GLB Forge 1.0') errors.push(`${fileName}: generator identity mismatch`)
}

const report = {
  ok: errors.length === 0,
  packId: receipt.packId,
  assets: Object.keys(contracts),
  nodes: receipt.assets?.reduce((total, asset) => total + asset.nodes, 0),
  animations: receipt.assets?.reduce((total, asset) => total + asset.animations.length, 0),
  errors,
}
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exit(1)
