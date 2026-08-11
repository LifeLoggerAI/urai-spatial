#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('urai-tier1/public/assets/urai/generated/human-rig-v3')
const receiptPath = path.resolve('operations/assets/generated-receipts/urai-human-rig-v3.json')
const expectedAnimations = ['idle_breath', 'listen_acknowledge', 'speak_calm', 'gesture_open', 'gaze_shift']
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))

if (receipt.packId !== 'urai-human-rig-v3') throw new Error('wrong pack id')
if (receipt.cameraAspect !== '5:4') throw new Error('camera aspect must be 5:4')
if (receipt.modelCount !== 7) throw new Error(`expected 7 models, got ${receipt.modelCount}`)
if (receipt.selectedProduction !== false) throw new Error('V3 must remain review-only until visual topology gates pass')

function parseGlb(file) {
  const data = fs.readFileSync(file)
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: invalid GLB magic`)
  if (data.readUInt32LE(4) !== 2) throw new Error(`${file}: invalid GLB version`)
  if (data.readUInt32LE(8) !== data.length) throw new Error(`${file}: GLB length mismatch`)
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
  const file = path.join(root, asset.fileName)
  const doc = parseGlb(file)
  if (asset.heightMeters < 1.55 || asset.heightMeters > 2.05) throw new Error(`${asset.fileName}: height ${asset.heightMeters} outside human lock`)
  if (asset.joints !== 17) throw new Error(`${asset.fileName}: receipt joint count mismatch`)
  if (asset.embeddedTextures !== 8) throw new Error(`${asset.fileName}: expected 8 embedded textures`)
  const skins = doc.skins ?? []
  if (skins.length !== 1 || skins[0].joints.length !== 17) throw new Error(`${asset.fileName}: expected one 17-joint skin`)
  const animations = (doc.animations ?? []).map((entry) => entry.name)
  if (JSON.stringify(animations) !== JSON.stringify(expectedAnimations)) throw new Error(`${asset.fileName}: animation contract mismatch: ${animations.join(', ')}`)
  const skinnedNodes = (doc.nodes ?? []).filter((node) => Number.isInteger(node.skin) && Number.isInteger(node.mesh))
  if (skinnedNodes.length !== 1) throw new Error(`${asset.fileName}: expected exactly one skinned mesh node`)
  const mesh = doc.meshes[skinnedNodes[0].mesh]
  for (const primitive of mesh.primitives ?? []) {
    const attrs = primitive.attributes ?? {}
    for (const key of ['POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0']) if (!Number.isInteger(attrs[key])) throw new Error(`${asset.fileName}: missing ${key}`)
    const joints = doc.accessors[attrs.JOINTS_0]
    const weights = doc.accessors[attrs.WEIGHTS_0]
    if (joints.componentType !== 5123 || joints.type !== 'VEC4') throw new Error(`${asset.fileName}: JOINTS_0 contract mismatch`)
    if (weights.componentType !== 5126 || weights.type !== 'VEC4') throw new Error(`${asset.fileName}: WEIGHTS_0 contract mismatch`)
  }
  const ibm = doc.accessors[skins[0].inverseBindMatrices]
  if (ibm.type !== 'MAT4' || ibm.count !== 17) throw new Error(`${asset.fileName}: inverse bind matrix contract mismatch`)
  const jointSet = new Set(skins[0].joints)
  for (const animation of doc.animations ?? []) for (const channel of animation.channels ?? []) if (!jointSet.has(channel.target.node)) throw new Error(`${asset.fileName}: animation targets a non-joint node`)
  console.log(`${asset.fileName}: PASS ${asset.heightMeters}m / 17 joints / 5 clips`)
}

console.log(`URAI Human Rig V3 PASS — ${receipt.modelCount} GLBs, ${receipt.totalVertices} vertices, ${receipt.totalFaces} faces`)
