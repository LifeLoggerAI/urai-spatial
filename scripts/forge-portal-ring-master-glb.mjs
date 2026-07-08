#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const outPath = path.join(repoRoot, 'urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb')

const materials = [
  material('obsidian_outer_shell', [0.018, 0.021, 0.035, 0.92], [0.0, 0.018, 0.032], 0.72, 0.18, 'BLEND'),
  material('smoked_metal_frame', [0.035, 0.039, 0.06, 1], [0.0, 0.012, 0.02], 0.88, 0.2),
  material('portal_energy_cyan_core', [0.04, 0.68, 1.0, 0.68], [0.0, 0.9, 1.0], 0.05, 0.04, 'BLEND'),
  material('violet_memory_seam', [0.45, 0.16, 1.0, 0.62], [0.5, 0.18, 1.0], 0.08, 0.06, 'BLEND'),
  material('gold_provenance_ticks', [1.0, 0.62, 0.2, 1], [0.55, 0.28, 0.05], 0.55, 0.16),
]

const meshes = []
const nodes = []
const primitiveChunks = []

addTorus('portal_outer_obsidian_ring', 2.35, 0.13, 0, 1, 72, 12)
addTorus('portal_inner_energy_lip', 1.82, 0.055, 0.02, 2, 72, 8)
addTorus('portal_violet_memory_seam', 2.08, 0.032, -0.035, 3, 72, 8)
addTorus('portal_rear_depth_ring', 2.18, 0.075, -0.32, 0, 72, 8)
addTorus('portal_front_depth_ring', 2.18, 0.075, 0.32, 0, 72, 8)

for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2
  const r = 2.35
  const x = Math.cos(angle) * r
  const y = Math.sin(angle) * r
  const tick = addBox(`portal_gold_alignment_tick_${String(i + 1).padStart(2, '0')}`, [x, y, 0.38], [0.12, 0.34, 0.08], 4)
  nodes[tick].rotation = [0, 0, angle]
}

for (let i = 0; i < 18; i++) {
  const angle = (i / 18) * Math.PI * 2
  const r = 1.48 + (i % 3) * 0.08
  const x = Math.cos(angle) * r
  const y = Math.sin(angle) * r
  addBox(`portal_inner_particle_depth_${String(i + 1).padStart(2, '0')}`, [x, y, -0.18 + (i % 5) * 0.08], [0.045, 0.045, 0.045], i % 2 === 0 ? 2 : 3)
}

const glb = buildGlb()
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, glb)
console.log(JSON.stringify({ ok: true, asset: path.relative(repoRoot, outPath), sizeBytes: glb.length }, null, 2))

function material(name, baseColorFactor, emissiveFactor, metallicFactor, roughnessFactor, alphaMode = 'OPAQUE') {
  return {
    name,
    pbrMetallicRoughness: { baseColorFactor, metallicFactor, roughnessFactor },
    emissiveFactor,
    alphaMode,
    doubleSided: true,
  }
}

function addTorus(name, radius, tube, z, materialIndex, radialSegments, tubeSegments) {
  const primitive = createTorusPrimitive(radius, tube, z, radialSegments, tubeSegments)
  const meshIndex = meshes.length
  primitiveChunks.push(primitive)
  meshes.push({ name, primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: materialIndex }] })
  nodes.push({ name, mesh: meshIndex })
  return nodes.length - 1
}

function addBox(name, center, scale, materialIndex) {
  const primitive = createBoxPrimitive(center, scale)
  const meshIndex = meshes.length
  primitiveChunks.push(primitive)
  meshes.push({ name, primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: materialIndex }] })
  nodes.push({ name, mesh: meshIndex })
  return nodes.length - 1
}

function createTorusPrimitive(radius, tube, z, radialSegments, tubeSegments) {
  const positions = []
  const normals = []
  const indices = []
  for (let i = 0; i < radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2
    const cu = Math.cos(u)
    const su = Math.sin(u)
    for (let j = 0; j < tubeSegments; j++) {
      const v = (j / tubeSegments) * Math.PI * 2
      const cv = Math.cos(v)
      const sv = Math.sin(v)
      const x = (radius + tube * cv) * cu
      const y = (radius + tube * cv) * su
      const zz = z + tube * sv
      positions.push(x, y, zz)
      normals.push(cv * cu, cv * su, sv)
    }
  }
  for (let i = 0; i < radialSegments; i++) {
    const ni = (i + 1) % radialSegments
    for (let j = 0; j < tubeSegments; j++) {
      const nj = (j + 1) % tubeSegments
      const a = i * tubeSegments + j
      const b = ni * tubeSegments + j
      const c = ni * tubeSegments + nj
      const d = i * tubeSegments + nj
      indices.push(a, b, c, a, c, d)
    }
  }
  return { positions, normals, indices }
}

function createBoxPrimitive(center, scale) {
  const [cx, cy, cz] = center
  const [sx, sy, sz] = scale.map((v) => v / 2)
  const p = [
    [cx - sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz - sz], [cx + sx, cy + sy, cz - sz], [cx - sx, cy + sy, cz - sz],
    [cx - sx, cy - sy, cz + sz], [cx + sx, cy - sy, cz + sz], [cx + sx, cy + sy, cz + sz], [cx - sx, cy + sy, cz + sz],
  ]
  const faces = [
    [0, 1, 2, 3, [0, 0, -1]], [4, 7, 6, 5, [0, 0, 1]], [0, 4, 5, 1, [0, -1, 0]],
    [3, 2, 6, 7, [0, 1, 0]], [1, 5, 6, 2, [1, 0, 0]], [0, 3, 7, 4, [-1, 0, 0]],
  ]
  const positions = []
  const normals = []
  const indices = []
  for (const face of faces) {
    const base = positions.length / 3
    for (let i = 0; i < 4; i++) {
      positions.push(...p[face[i]])
      normals.push(...face[4])
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return { positions, normals, indices }
}

function buildGlb() {
  const binParts = []
  const bufferViews = []
  const accessors = []
  let byteOffset = 0

  const append = (typedArray, target, accessor) => {
    const bytes = Buffer.from(typedArray.buffer)
    const alignedOffset = align4(byteOffset)
    if (alignedOffset > byteOffset) binParts.push(Buffer.alloc(alignedOffset - byteOffset))
    byteOffset = alignedOffset
    const viewIndex = bufferViews.length
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, target })
    binParts.push(bytes)
    byteOffset += bytes.length
    accessors.push({ bufferView: viewIndex, ...accessor })
    return accessors.length - 1
  }

  primitiveChunks.forEach((primitive, index) => {
    const pos = new Float32Array(primitive.positions)
    const nor = new Float32Array(primitive.normals)
    const ind = new Uint16Array(primitive.indices)
    const posAccessor = append(pos, 34962, { componentType: 5126, count: pos.length / 3, type: 'VEC3', min: minVec3(pos), max: maxVec3(pos) })
    const normalAccessor = append(nor, 34962, { componentType: 5126, count: nor.length / 3, type: 'VEC3' })
    const indexAccessor = append(ind, 34963, { componentType: 5123, count: ind.length, type: 'SCALAR', min: [0], max: [Math.max(...primitive.indices)] })
    meshes[index].primitives[0].attributes.POSITION = posAccessor
    meshes[index].primitives[0].attributes.NORMAL = normalAccessor
    meshes[index].primitives[0].indices = indexAccessor
  })

  const bin = Buffer.concat(binParts)
  const json = {
    asset: { version: '2.0', generator: 'URAI deterministic portal ring master forge' },
    scene: 0,
    scenes: [{ name: 'URAI Portal Ring Master', nodes: nodes.map((_, index) => index) }],
    nodes,
    meshes,
    materials,
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors,
  }
  return encodeGlb(json, bin)
}

function encodeGlb(json, bin) {
  const jsonBuffer = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20)
  const binBuffer = pad4(bin, 0x00)
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonBuffer.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binBuffer.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer])
}

function pad4(buffer, padByte) {
  const pad = (4 - (buffer.length % 4)) % 4
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad, padByte)]) : buffer
}

function align4(value) {
  return value + ((4 - (value % 4)) % 4)
}

function minVec3(array) {
  const min = [Infinity, Infinity, Infinity]
  for (let i = 0; i < array.length; i += 3) for (let j = 0; j < 3; j++) min[j] = Math.min(min[j], array[i + j])
  return min
}

function maxVec3(array) {
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < array.length; i += 3) for (let j = 0; j < 3; j++) max[j] = Math.max(max[j], array[i + j])
  return max
}
