#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const repoRoot = process.cwd()
const generatedRoot = path.join(repoRoot, 'urai-tier1/public/assets/urai/generated')
const manifestPath = path.join(repoRoot, 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json')

const glbAssets = [
  {
    id: 'ground-world-terrain-glb-v1',
    path: 'models/ground-world-terrain-v1.glb',
    sceneName: 'URAI Ground World Terrain',
    kind: 'ground',
    nodes: [
      { name: 'walkable_lower_ground_terrain', type: 'box', center: [0, -0.12, 0], scale: [11, 0.24, 8.5], material: 1 },
      { name: 'home_descent_landing_zone', type: 'ring', radius: 2.35, tube: 0.07, z: -2.8, y: 0.05, material: 2 },
      { name: 'private_operation_path_left', type: 'box', center: [-3.2, 0.03, 0.7], scale: [0.42, 0.12, 5.8], material: 3 },
      { name: 'private_operation_path_right', type: 'box', center: [3.2, 0.03, 0.7], scale: [0.42, 0.12, 5.8], material: 3 },
      { name: 'ground_memory_room_pad', type: 'box', center: [-2.4, 0.08, 2.8], scale: [1.7, 0.18, 1.25], material: 4 },
      { name: 'ground_wellness_room_pad', type: 'box', center: [0, 0.08, 3.25], scale: [1.7, 0.18, 1.25], material: 4 },
      { name: 'ground_privacy_room_pad', type: 'box', center: [2.4, 0.08, 2.8], scale: [1.7, 0.18, 1.25], material: 4 },
    ],
  },
  {
    id: 'focus-star-flight-glb-v1',
    path: 'models/focus-star-flight-v1.glb',
    sceneName: 'URAI Focus Star Flight',
    kind: 'focus',
    nodes: [
      { name: 'focus_star_outer_portal_shell', type: 'torus', radius: 2.1, tube: 0.09, z: 0, material: 2 },
      { name: 'focus_star_memory_core', type: 'pyramid', center: [0, 0, -0.2], scale: [0.86, 0.86, 0.86], material: 4 },
      { name: 'focus_flight_tunnel_ring_01', type: 'torus', radius: 1.65, tube: 0.035, z: -0.9, material: 3 },
      { name: 'focus_flight_tunnel_ring_02', type: 'torus', radius: 1.25, tube: 0.03, z: -1.7, material: 2 },
      { name: 'focus_flight_tunnel_ring_03', type: 'torus', radius: 0.85, tube: 0.026, z: -2.4, material: 3 },
    ],
  },
  {
    id: 'replay-memory-film-glb-v1',
    path: 'models/replay-memory-film-v1.glb',
    sceneName: 'URAI Replay Memory Film',
    kind: 'replay',
    nodes: [
      { name: 'replay_memory_thread_tunnel', type: 'torus', radius: 2.05, tube: 0.055, z: 0, material: 3 },
      { name: 'replay_film_frame_left', type: 'box', center: [-1.45, 0, -0.25], scale: [0.16, 2.15, 0.12], material: 1 },
      { name: 'replay_film_frame_right', type: 'box', center: [1.45, 0, -0.25], scale: [0.16, 2.15, 0.12], material: 1 },
      { name: 'replay_memory_screen_plane', type: 'box', center: [0, 0, -0.32], scale: [2.5, 1.35, 0.045], material: 2 },
      { name: 'replay_beat_marker_01', type: 'box', center: [-0.95, -1.05, 0.05], scale: [0.16, 0.16, 0.16], material: 4 },
      { name: 'replay_beat_marker_02', type: 'box', center: [0, -1.05, 0.05], scale: [0.16, 0.16, 0.16], material: 4 },
      { name: 'replay_beat_marker_03', type: 'box', center: [0.95, -1.05, 0.05], scale: [0.16, 0.16, 0.16], material: 4 },
    ],
  },
  {
    id: 'passport-status-room-glb-v1',
    path: 'models/passport-status-room-v1.glb',
    sceneName: 'URAI Passport Status Room',
    kind: 'passport-status',
    nodes: [
      { name: 'identity_vault_floor', type: 'box', center: [0, -0.1, 0], scale: [5.8, 0.18, 3.8], material: 1 },
      { name: 'passport_identity_plinth', type: 'box', center: [-1.45, 0.55, -0.35], scale: [1.05, 1.1, 0.82], material: 0 },
      { name: 'status_beacon_tower', type: 'box', center: [1.45, 1.05, -0.45], scale: [0.68, 2.1, 0.68], material: 2 },
      { name: 'privacy_shield_arch', type: 'torus', radius: 1.85, tube: 0.045, z: -0.78, material: 3 },
    ],
  },
]

fs.mkdirSync(path.join(generatedRoot, 'models'), { recursive: true })
fs.mkdirSync(path.join(generatedRoot, 'skyboxes'), { recursive: true })
fs.mkdirSync(path.join(generatedRoot, 'textures'), { recursive: true })

if (fs.existsSync(path.join(repoRoot, 'scripts/forge-portal-ring-master-glb.mjs'))) {
  execFileSync('node', ['scripts/forge-portal-ring-master-glb.mjs'], { cwd: repoRoot, stdio: 'inherit' })
}

for (const asset of glbAssets) {
  const outPath = path.join(generatedRoot, asset.path)
  fs.writeFileSync(outPath, buildGlb(asset.sceneName, asset.nodes))
  console.log(JSON.stringify({ ok: true, asset: path.relative(repoRoot, outPath), id: asset.id, sizeBytes: fs.statSync(outPath).size }, null, 2))
}

const skyboxPath = path.join(generatedRoot, 'skyboxes/life-map-galaxy-skybox-v1.hdr')
fs.writeFileSync(skyboxPath, makeRadianceHdr(64, 32))
console.log(JSON.stringify({ ok: true, asset: path.relative(repoRoot, skyboxPath), id: 'life-map-galaxy-skybox-v1', sizeBytes: fs.statSync(skyboxPath).size }, null, 2))

if (!fs.existsSync(manifestPath)) {
  fs.writeFileSync(manifestPath, JSON.stringify({
    version: 'global-cinematic-material-pack-v1',
    generatedAt: new Date().toISOString(),
    materials: {
      obsidian_glass: { baseColor: '#070914', metallic: 0.2, roughness: 0.12, opacity: 0.82 },
      smoked_metal: { baseColor: '#111827', metallic: 0.86, roughness: 0.22 },
      portal_energy: { emissive: '#00ccff', intensity: 1.4 },
      violet_memory_glow: { emissive: '#7c3cff', intensity: 1.15 },
      gold_provenance: { emissive: '#d89b34', intensity: 0.85 },
    },
  }, null, 2) + '\n')
}

const paidReceiptIds = [
  'portal-ring-master-glb-v1',
  'ground-world-terrain-glb-v1',
  'life-map-galaxy-skybox-v1',
  'global-cinematic-material-pack-v1',
]
for (const id of paidReceiptIds) {
  execFileSync('node', ['scripts/receipt-single-v1-paid-asset.mjs', id], { cwd: repoRoot, stdio: 'inherit' })
}

function material(name, baseColorFactor, emissiveFactor, metallicFactor, roughnessFactor, alphaMode = 'OPAQUE') {
  return { name, pbrMetallicRoughness: { baseColorFactor, metallicFactor, roughnessFactor }, emissiveFactor, alphaMode, doubleSided: true }
}

const materials = [
  material('obsidian_glass', [0.018, 0.021, 0.035, 0.9], [0.0, 0.018, 0.032], 0.55, 0.18, 'BLEND'),
  material('smoked_metal', [0.035, 0.04, 0.06, 1], [0.0, 0.012, 0.02], 0.88, 0.22),
  material('portal_energy_cyan', [0.04, 0.68, 1.0, 0.66], [0.0, 0.9, 1.0], 0.05, 0.04, 'BLEND'),
  material('violet_memory_glow', [0.45, 0.16, 1.0, 0.62], [0.5, 0.18, 1.0], 0.08, 0.06, 'BLEND'),
  material('gold_provenance', [1.0, 0.62, 0.2, 1], [0.55, 0.28, 0.05], 0.55, 0.16),
]

function buildGlb(sceneName, nodeSpecs) {
  const meshes = []
  const nodes = []
  const chunks = []
  for (const spec of nodeSpecs) {
    let primitive
    if (spec.type === 'box') primitive = createBoxPrimitive(spec.center, spec.scale)
    if (spec.type === 'ring') primitive = createRingPrimitive(spec.radius, spec.tube, spec.y ?? 0, spec.z ?? 0, 64)
    if (spec.type === 'torus') primitive = createTorusPrimitive(spec.radius, spec.tube, spec.z ?? 0, 72, 10)
    if (spec.type === 'pyramid') primitive = createPyramidPrimitive(spec.center, spec.scale)
    if (!primitive) throw new Error(`Unknown node type ${spec.type}`)
    const meshIndex = meshes.length
    chunks.push(primitive)
    meshes.push({ name: spec.name, primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: spec.material ?? 0 }] })
    nodes.push({ name: spec.name, mesh: meshIndex, rotation: spec.rotation })
  }

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
  chunks.forEach((primitive, index) => {
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
  const json = { asset: { version: '2.0', generator: 'URAI V1 spatial candidate batch forge' }, scene: 0, scenes: [{ name: sceneName, nodes: nodes.map((_, index) => index) }], nodes, meshes, materials, buffers: [{ byteLength: bin.length }], bufferViews, accessors }
  return encodeGlb(json, bin)
}

function createBoxPrimitive(center, scale) {
  const [cx, cy, cz] = center
  const [sx, sy, sz] = scale.map((v) => v / 2)
  const p = [[cx - sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz - sz], [cx + sx, cy + sy, cz - sz], [cx - sx, cy + sy, cz - sz], [cx - sx, cy - sy, cz + sz], [cx + sx, cy - sy, cz + sz], [cx + sx, cy + sy, cz + sz], [cx - sx, cy + sy, cz + sz]]
  const faces = [[0, 1, 2, 3, [0, 0, -1]], [4, 7, 6, 5, [0, 0, 1]], [0, 4, 5, 1, [0, -1, 0]], [3, 2, 6, 7, [0, 1, 0]], [1, 5, 6, 2, [1, 0, 0]], [0, 3, 7, 4, [-1, 0, 0]]]
  const positions = [], normals = [], indices = []
  for (const face of faces) {
    const base = positions.length / 3
    for (let i = 0; i < 4; i++) { positions.push(...p[face[i]]); normals.push(...face[4]) }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return { positions, normals, indices }
}

function createRingPrimitive(radius, tube, y, z, segments) {
  const positions = [], normals = [], indices = []
  const h = tube * 0.5
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    for (const [r, zz] of [[radius - tube, z - h], [radius + tube, z - h], [radius + tube, z + h], [radius - tube, z + h]]) {
      positions.push(ca * r, y, sa * r + zz)
      normals.push(ca, 0.15, sa)
    }
  }
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments
    for (const pair of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
      const a = i * 4 + pair[0], b = i * 4 + pair[1], c = n * 4 + pair[1], d = n * 4 + pair[0]
      indices.push(a, b, c, a, c, d)
    }
  }
  return { positions, normals, indices }
}

function createTorusPrimitive(radius, tube, z, radialSegments, tubeSegments) {
  const positions = [], normals = [], indices = []
  for (let i = 0; i < radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u)
    for (let j = 0; j < tubeSegments; j++) {
      const v = (j / tubeSegments) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v)
      positions.push((radius + tube * cv) * cu, (radius + tube * cv) * su, z + tube * sv)
      normals.push(cv * cu, cv * su, sv)
    }
  }
  for (let i = 0; i < radialSegments; i++) {
    const ni = (i + 1) % radialSegments
    for (let j = 0; j < tubeSegments; j++) {
      const nj = (j + 1) % tubeSegments
      const a = i * tubeSegments + j, b = ni * tubeSegments + j, c = ni * tubeSegments + nj, d = i * tubeSegments + nj
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
  const positions = [], normals = [], indices = []
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, start = positions.length / 3
    positions.push(...base[i], ...base[j], ...top)
    normals.push(0, 0.6, 0.8, 0, 0.6, 0.8, 0, 0.6, 0.8)
    indices.push(start, start + 1, start + 2)
  }
  const b = positions.length / 3
  for (const point of base) { positions.push(...point); normals.push(0, -1, 0) }
  indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
  return { positions, normals, indices }
}

function makeRadianceHdr(width, height) {
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.0000000000000\n\n-Y ${height} +X ${width}\n`, 'ascii')
  const pixels = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = y / Math.max(1, height - 1)
      const star = ((x * 31 + y * 17) % 97) < 2 ? 180 : 0
      const r = Math.min(255, 8 + Math.floor(20 * (1 - t)) + star)
      const g = Math.min(255, 10 + Math.floor(32 * (1 - t)) + star)
      const b = Math.min(255, 26 + Math.floor(80 * (1 - t)) + star)
      pixels.push(r, g, b, 129)
    }
  }
  return Buffer.concat([header, Buffer.from(pixels)])
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
function pad4(buffer, padByte) { const pad = (4 - (buffer.length % 4)) % 4; return pad ? Buffer.concat([buffer, Buffer.alloc(pad, padByte)]) : buffer }
function align4(value) { return value + ((4 - (value % 4)) % 4) }
function minVec3(array) { const min = [Infinity, Infinity, Infinity]; for (let i = 0; i < array.length; i += 3) for (let j = 0; j < 3; j++) min[j] = Math.min(min[j], array[i + j]); return min }
function maxVec3(array) { const max = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < array.length; i += 3) for (let j = 0; j < 3; j++) max[j] = Math.max(max[j], array[i + j]); return max }
