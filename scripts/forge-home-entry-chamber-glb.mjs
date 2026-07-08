#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const outPath = path.join(repoRoot, 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb')

const materials = [
  material('obsidian_glass', [0.015, 0.018, 0.035, 0.82], [0.0, 0.08, 0.14], 0.34, 0.16, 'BLEND'),
  material('smoked_metal', [0.035, 0.04, 0.065, 1], [0.0, 0.015, 0.025], 0.86, 0.22),
  material('portal_energy_cyan', [0.06, 0.58, 1.0, 0.62], [0.0, 0.72, 1.0], 0.12, 0.08, 'BLEND'),
  material('provenance_gold', [1.0, 0.62, 0.18, 1], [0.45, 0.24, 0.04], 0.55, 0.2),
  material('violet_memory_glow', [0.44, 0.18, 1.0, 0.54], [0.52, 0.2, 1.0], 0.08, 0.12, 'BLEND'),
]

const meshes = []
const nodes = []
const primitiveChunks = []

function addBox(name, center, scale, materialIndex) {
  const meshIndex = meshes.length
  const primitive = createBoxPrimitive(center, scale)
  primitiveChunks.push(primitive)
  meshes.push({
    name,
    primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: materialIndex }],
  })
  nodes.push({ name, mesh: meshIndex })
}

function addRing(name, radius, tube, y, materialIndex, segments = 48) {
  const meshIndex = meshes.length
  const primitive = createRingPrimitive(radius, tube, y, segments)
  primitiveChunks.push(primitive)
  meshes.push({
    name,
    primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: materialIndex }],
  })
  nodes.push({ name, mesh: meshIndex })
}

function addPyramid(name, center, scale, materialIndex) {
  const meshIndex = meshes.length
  const primitive = createPyramidPrimitive(center, scale)
  primitiveChunks.push(primitive)
  meshes.push({
    name,
    primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: materialIndex }],
  })
  nodes.push({ name, mesh: meshIndex })
}

// Walkable floor/orientation.
addBox('walkable_obsidian_floor_plate', [0, -0.08, 0], [8.6, 0.16, 8.6], 1)
addRing('luminous_floor_threshold_ring_outer', 4.15, 0.07, 0.02, 2)
addRing('luminous_floor_threshold_ring_inner', 2.35, 0.055, 0.05, 4)
addBox('ground_descent_aperture_glow_below', [0, -0.2, 2.65], [2.45, 0.08, 1.15], 4)
addBox('life_map_sky_reflection_aperture', [0, 3.6, -2.9], [3.6, 0.08, 0.8], 2)

// Central orb pedestal and navigation anchor.
addBox('central_orb_pedestal_base', [0, 0.25, 0], [1.25, 0.5, 1.25], 1)
addRing('central_orb_energy_equator', 0.82, 0.035, 1.22, 2)
addPyramid('central_memory_orb_faceted_core', [0, 1.32, 0], [0.78, 0.78, 0.78], 4)

// Portal anchor positions, intentionally no text.
addRing('portal_anchor_ground_left', 1.05, 0.055, 1.15, 2, 36)
addRing('portal_anchor_life_map_right', 1.05, 0.055, 1.15, 2, 36)
addRing('portal_anchor_passport_status_rear', 0.82, 0.045, 1.05, 3, 32)
nodes[nodes.length - 3].translation = [-3.15, 0, -1.1]
nodes[nodes.length - 2].translation = [3.15, 0, -1.1]
nodes[nodes.length - 1].translation = [0, 0, 3.35]

// Architectural depth ribs.
for (let i = 0; i < 10; i++) {
  const angle = (i / 10) * Math.PI * 2
  const x = Math.cos(angle) * 4.45
  const z = Math.sin(angle) * 4.45
  addBox(`vertical_depth_rib_${String(i + 1).padStart(2, '0')}`, [x, 1.75, z], [0.12, 3.5, 0.12], i % 2 === 0 ? 0 : 1)
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

function createRingPrimitive(radius, tube, y, segments) {
  const positions = []
  const normals = []
  const indices = []
  const h = tube * 0.5
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    for (const [r, yy] of [[radius - tube, y - h], [radius + tube, y - h], [radius + tube, y + h], [radius - tube, y + h]]) {
      positions.push(ca * r, yy, sa * r)
      normals.push(ca, 0.15, sa)
    }
  }
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments
    for (const pair of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
      const a = i * 4 + pair[0]
      const b = i * 4 + pair[1]
      const c = n * 4 + pair[1]
      const d = n * 4 + pair[0]
      indices.push(a, b, c, a, c, d)
    }
  }
  return { positions, normals, indices }
}

function createPyramidPrimitive(center, scale) {
  const [cx, cy, cz] = center
  const [sx, sy, sz] = scale
  const top = [cx, cy + sy, cz]
  const base = [[cx - sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz + sz], [cx - sx, cy - sy, cz + sz]]
  const positions = []
  const normals = []
  const indices = []
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    const start = positions.length / 3
    positions.push(...base[i], ...base[j], ...top)
    normals.push(0, 0.6, 0.8, 0, 0.6, 0.8, 0, 0.6, 0.8)
    indices.push(start, start + 1, start + 2)
  }
  const b = positions.length / 3
  for (const point of base) {
    positions.push(...point)
    normals.push(0, -1, 0)
  }
  indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
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
    asset: { version: '2.0', generator: 'URAI deterministic home entry chamber forge' },
    scene: 0,
    scenes: [{ name: 'URAI Home Entry Chamber', nodes: nodes.map((_, index) => index) }],
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
