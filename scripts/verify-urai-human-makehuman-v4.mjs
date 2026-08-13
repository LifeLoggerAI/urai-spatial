#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('urai-tier1/public/assets/urai/generated/human-makehuman-v4')
const receipt = JSON.parse(fs.readFileSync('operations/assets/generated-receipts/urai-human-makehuman-v4.json', 'utf8'))
const clips = ['idle_breath', 'listen_acknowledge', 'speak_calm', 'gesture_open', 'gaze_shift']
const source = {
  repository: 'makehumancommunity/makehuman',
  commit: 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482',
  blobSha: 'd26635e9326e3cca30778fd7b9c00062b03cce09',
  path: 'makehuman/data/3dobjs/base.obj',
  license: 'CC0-1.0',
}

if (receipt.packId !== 'urai-human-makehuman-v4' || receipt.modelCount !== 7) throw new Error('V4 receipt identity/count mismatch')
if (receipt.cameraAspect !== '5:4' || receipt.units !== 'meters' || receipt.selectedProduction !== false) throw new Error('V4 production/framing contract mismatch')
for (const [key, value] of Object.entries(source)) if (receipt.source?.[key] !== value) throw new Error(`V4 source ${key} mismatch`)

function parseGlb(file) {
  const data = fs.readFileSync(file)
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) throw new Error(`${file}: invalid GLB envelope`)
  let offset = 12
  while (offset < data.length) {
    const length = data.readUInt32LE(offset)
    const type = data.readUInt32LE(offset + 4)
    offset += 8
    const payload = data.subarray(offset, offset + length)
    offset += length
    if (type === 0x4e4f534a) return JSON.parse(payload.toString('utf8').replace(/[\u0000\s]+$/g, ''))
  }
  throw new Error(`${file}: JSON chunk missing`)
}

for (const asset of receipt.assets) {
  if (asset.heightMeters < 1.55 || asset.heightMeters > 2.05) throw new Error(`${asset.fileName}: height outside human lock`)
  const doc = parseGlb(path.join(root, asset.fileName))
  const extras = doc.asset?.extras ?? {}
  if (extras.sourceRepo !== source.repository || extras.sourceCommit !== source.commit || extras.sourceBlob !== source.blobSha || extras.sourceLicense !== source.license) throw new Error(`${asset.fileName}: embedded provenance mismatch`)
  const skins = doc.skins ?? []
  if (skins.length !== 1 || skins[0].joints.length !== 17) throw new Error(`${asset.fileName}: expected one 17-joint skin`)
  const names = (doc.animations ?? []).map((animation) => animation.name)
  if (JSON.stringify(names) !== JSON.stringify(clips)) throw new Error(`${asset.fileName}: animation clip mismatch`)
  const skinned = (doc.nodes ?? []).filter((node) => Number.isInteger(node.skin) && Number.isInteger(node.mesh))
  if (skinned.length !== 1) throw new Error(`${asset.fileName}: expected exactly one skinned mesh`)
  for (const primitive of doc.meshes[skinned[0].mesh].primitives ?? []) {
    const attrs = primitive.attributes ?? {}
    for (const name of ['POSITION','NORMAL','JOINTS_0','WEIGHTS_0']) if (!Number.isInteger(attrs[name])) throw new Error(`${asset.fileName}: missing ${name}`)
    const joints = doc.accessors[attrs.JOINTS_0]
    const weights = doc.accessors[attrs.WEIGHTS_0]
    if (joints.componentType !== 5123 || joints.type !== 'VEC4') throw new Error(`${asset.fileName}: JOINTS_0 mismatch`)
    if (weights.componentType !== 5126 || weights.type !== 'VEC4') throw new Error(`${asset.fileName}: WEIGHTS_0 mismatch`)
  }
  const ibm = doc.accessors[skins[0].inverseBindMatrices]
  if (ibm.type !== 'MAT4' || ibm.count !== 17) throw new Error(`${asset.fileName}: inverse bind matrices mismatch`)
  const jointSet = new Set(skins[0].joints)
  for (const animation of doc.animations ?? []) for (const channel of animation.channels ?? []) if (!jointSet.has(channel.target.node)) throw new Error(`${asset.fileName}: animation targets non-joint node`)
  console.log(`${asset.fileName}: PASS / ${asset.heightMeters}m / MakeHuman CC0 topology / 17 joints / 5 clips`)
}
console.log('URAI Human MakeHuman V4 contract PASS')
