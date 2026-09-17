#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const manifestPath = path.join(repoRoot, 'operations/assets/launch-critical-assets.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const receiptRoot = path.join(repoRoot, manifest.receiptRoot)
fs.mkdirSync(receiptRoot, { recursive: true })

const generators = {
  'home-entry-chamber-v1': () => buildGlb('URAI Home Entry Chamber', [
    box('threshold-floor', [0, -0.15, 0], [13, 0.3, 13], 0),
    torus('central-threshold-ring', 2.7, 0.11, [0, 0.2, 0], 1),
    box('left-architecture-fin', [-4.6, 2.1, -1.2], [0.45, 4.4, 5.5], 2),
    box('right-architecture-fin', [4.6, 2.1, -1.2], [0.45, 4.4, 5.5], 2),
    torus('sky-portal-frame', 3.2, 0.09, [0, 3.1, -4.2], 1, [Math.PI / 2, 0, 0]),
    sphere('home-orb-anchor', [0, 1.5, 1.2], 0.38, 3),
  ]),
  'ground-world-terrain-v1': () => buildGlb('URAI Ground Terrain', [
    box('ground-main-platform', [0, -0.2, 0], [22, 0.4, 18], 0),
    box('memory-path-left', [-4.2, 0.08, 1.5], [1.1, 0.16, 10], 2),
    box('memory-path-center', [0, 0.08, 2.2], [1.1, 0.16, 11], 1),
    box('memory-path-right', [4.2, 0.08, 1.5], [1.1, 0.16, 10], 2),
    torus('descent-landing-ring', 2.6, 0.08, [0, 0.14, -4.4], 1),
    box('ground-room-pad-left', [-4.2, 0.2, 6], [4.2, 0.28, 3.2], 3),
    box('ground-room-pad-center', [0, 0.2, 6.7], [4.2, 0.28, 3.2], 3),
    box('ground-room-pad-right', [4.2, 0.2, 6], [4.2, 0.28, 3.2], 3),
  ]),
  'life-map-memory-star-v1': () => buildGlb('URAI Life Map Memory Star', [
    sphere('memory-star-core', [0, 0, 0], 0.42, 1, 18, 12),
    sphere('memory-star-aura', [0, 0, 0], 0.8, 4, 16, 10),
    torus('memory-star-orbit', 1.08, 0.025, [0, 0, 0], 2, [Math.PI / 2.8, 0.35, 0]),
  ]),
  'focus-memory-chamber-v1': () => buildGlb('URAI Focus Memory Chamber', [
    torus('focus-entry-ring', 2.5, 0.09, [0, 0, 0], 1),
    torus('focus-depth-ring-1', 2.0, 0.055, [0, 0, -1.7], 2),
    torus('focus-depth-ring-2', 1.45, 0.045, [0, 0, -3.2], 1),
    torus('focus-depth-ring-3', 0.95, 0.035, [0, 0, -4.5], 2),
    sphere('selected-memory-core', [0, 0, -5.6], 0.55, 3, 20, 14),
    box('focus-memory-plinth', [0, -2.1, -5.6], [4.8, 0.28, 3.2], 0),
  ]),
  'replay-memory-environment-v1': () => buildGlb('URAI Replay Memory Environment', [
    box('replay-theater-floor', [0, -2.4, -1.5], [14, 0.35, 16], 0),
    box('replay-screen', [0, 0.6, -6.2], [7.8, 4.4, 0.18], 1),
    box('replay-frame-left', [-4.2, 0.6, -6.1], [0.35, 5.2, 0.4], 2),
    box('replay-frame-right', [4.2, 0.6, -6.1], [0.35, 5.2, 0.4], 2),
    torus('replay-entry-portal', 2.8, 0.11, [0, 0, 2.8], 1),
    box('timeline-rail', [0, -1.7, -1.2], [8.6, 0.14, 0.25], 3),
  ]),
  'urai-orb-avatar-v1': () => buildGlb('URAI Orb Avatar', [
    sphere('orb-core', [0, 0, 0], 0.34, 1, 24, 16),
    sphere('orb-inner-aura', [0, 0, 0], 0.56, 4, 20, 12),
    torus('orb-equatorial-ring', 0.72, 0.025, [0, 0, 0], 2),
    torus('orb-polar-ring', 0.6, 0.018, [0, 0, 0], 3, [Math.PI / 2, 0, 0]),
  ]),
  'portal-ring-master-v1': () => buildGlb('URAI Portal Ring Master', [
    torus('portal-outer-ring', 2.3, 0.12, [0, 0, 0], 0),
    torus('portal-energy-ring', 1.94, 0.055, [0, 0, 0.04], 1),
    box('portal-base-left', [-1.55, -2.35, 0], [1.15, 0.42, 1.25], 2),
    box('portal-base-right', [1.55, -2.35, 0], [1.15, 0.42, 1.25], 2),
  ]),
  'passport-status-room-v1': () => buildGlb('URAI Passport Status Room', [
    box('passport-room-floor', [0, -0.18, 0], [12, 0.36, 10], 0),
    box('passport-status-plinth', [0, 0.35, -1.8], [4.6, 0.7, 2.8], 3),
    box('passport-left-privacy-fin', [-4.2, 2.1, -1], [0.38, 4.6, 6.2], 2),
    box('passport-right-privacy-fin', [4.2, 2.1, -1], [0.38, 4.6, 6.2], 2),
    torus('passport-status-ring', 2.15, 0.09, [0, 2.25, -2.5], 1),
    torus('passport-privacy-lock-ring', 1.45, 0.055, [0, 2.25, -2.45], 2),
    sphere('passport-identity-core', [0, 2.25, -2.35], 0.48, 3, 20, 14),
  ]),
  'life-map-galaxy-skybox-v1': () => makeRadianceHdr(256, 128),
  'spatial-particle-atlas-v1': () => Buffer.from(makeParticleSvg(), 'utf8'),
  'global-cinematic-material-pack-v1': () => Buffer.from(JSON.stringify(makeMaterialPack(), null, 2) + '\n', 'utf8'),
  'urai-loading-sequence-v1': () => Buffer.from(JSON.stringify(makeLoadingSequence(), null, 2) + '\n', 'utf8'),
  'urai-ambient-bed-v1': () => makeAmbientWav(8, 22050),
}

const generated = []
for (const asset of manifest.assets) {
  const generator = generators[asset.id]
  const absolutePath = path.join(repoRoot, asset.fixedPath)
  const receiptPath = path.join(receiptRoot, `${asset.id}.json`)

  if (!generator) {
    // Some launch-critical assets are produced by dedicated governed pipelines
    // (for example the skinned human candidates). The generic forge must not
    // replace those certified binaries with an unrelated procedural stand-in.
    if (!fs.existsSync(absolutePath) || !fs.existsSync(receiptPath)) {
      throw new Error(`No generator registered for ${asset.id} and no governed dedicated-pipeline artifact/receipt is present`)
    }
    const payload = fs.readFileSync(absolutePath)
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
    const digest = crypto.createHash('sha256').update(payload).digest('hex')
    if (receipt.id !== asset.id) throw new Error(`Dedicated receipt id mismatch for ${asset.id}`)
    if (receipt.fixedPath !== asset.fixedPath) throw new Error(`Dedicated receipt path mismatch for ${asset.id}`)
    if (receipt.sha256 !== digest) throw new Error(`Dedicated artifact hash mismatch for ${asset.id}`)
    if (receipt.bytes !== payload.length) throw new Error(`Dedicated artifact byte-count mismatch for ${asset.id}`)
    generated.push(receipt)
    console.log(`${asset.id}: carried governed dedicated-pipeline artifact ${receipt.bytes} bytes ${receipt.sha256}`)
    continue
  }

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  const payload = generator()
  fs.writeFileSync(absolutePath, payload)
  const receipt = buildReceipt(asset, absolutePath, payload)
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
  generated.push(receipt)
  console.log(`${asset.id}: ${receipt.bytes} bytes ${receipt.sha256}`)
}

const summary = {
  manifestId: manifest.manifestId,
  generatedAt: new Date().toISOString(),
  candidateOnly: true,
  assetCount: generated.length,
  totalBytes: generated.reduce((sum, item) => sum + item.bytes, 0),
  assets: generated.map(({ id, fixedPath, bytes, sha256, measured }) => ({ id, fixedPath, bytes, sha256, measured })),
}
fs.writeFileSync(path.join(receiptRoot, 'forge-summary.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))

function buildReceipt(asset, absolutePath, payload) {
  const measured = measurePayload(asset, payload)
  return {
    schemaVersion: 1,
    id: asset.id,
    fixedPath: asset.fixedPath,
    targetRoutes: asset.targetRoutes,
    bytes: payload.length,
    sha256: crypto.createHash('sha256').update(payload).digest('hex'),
    measured,
    compressionStatus: candidateCompression(asset),
    requiredCompression: asset.requiredCompression,
    fallback: asset.fallback,
    source: asset.source,
    license: asset.license,
    generatedBy: 'scripts/forge-launch-critical-assets.mjs',
    generatedAt: new Date().toISOString(),
    releaseState: 'candidate-not-production-ready',
    absolutePath: path.relative(repoRoot, absolutePath),
  }
}

function measurePayload(asset, payload) {
  if (asset.kind === 'model') {
    const json = readGlbJson(payload)
    const triangleCount = json.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((meshSum, primitive) => {
      const accessor = json.accessors[primitive.indices]
      return meshSum + Math.floor(accessor.count / 3)
    }, 0), 0)
    return { triangleCount, targetBoundsMeters: asset.targetBoundsMeters }
  }
  if (asset.kind === 'hdr') return { resolution: [256, 128] }
  if (asset.kind === 'audio') return { durationSeconds: asset.durationSeconds, sampleRate: 22050, channels: 1 }
  if (asset.targetResolution) return { resolution: asset.targetResolution }
  return {}
}

function candidateCompression(asset) {
  if (asset.kind === 'model') return 'uncompressed-glb-candidate'
  if (asset.kind === 'audio') return 'pcm-wav-candidate'
  if (asset.kind === 'hdr') return 'rgbe-hdr'
  return asset.requiredCompression
}

function makeMaterialPack() {
  return {
    version: 'global-cinematic-material-pack-v1',
    materials: {
      obsidianGlass: { baseColor: '#060912', roughness: 0.12, metalness: 0.24, opacity: 0.82 },
      smokedMetal: { baseColor: '#121827', roughness: 0.24, metalness: 0.86 },
      portalEnergy: { baseColor: '#2de8ff', emissive: '#00d9ff', emissiveIntensity: 1.5 },
      memoryViolet: { baseColor: '#7b42ff', emissive: '#6d28d9', emissiveIntensity: 1.2 },
      provenanceGold: { baseColor: '#f2b45c', emissive: '#8b4f14', emissiveIntensity: 0.55 },
    },
  }
}

function makeLoadingSequence() {
  return {
    version: 'urai-loading-sequence-v1',
    durationMs: 2200,
    accessibleLabel: 'Preparing your spatial world',
    frames: [
      { at: 0, state: 'dark-field', opacity: 0 },
      { at: 250, state: 'orb-seed', opacity: 0.35 },
      { at: 700, state: 'orb-awake', opacity: 0.8 },
      { at: 1250, state: 'portal-forming', opacity: 1 },
      { at: 1850, state: 'world-reveal', opacity: 1 },
      { at: 2200, state: 'complete', opacity: 0 },
    ],
  }
}

function makeParticleSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".18" stop-color="#9eeeff" stop-opacity=".95"/><stop offset=".52" stop-color="#7c3cff" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="1024" height="1024" fill="none"/><circle cx="256" cy="256" r="220" fill="url(#g)"/><circle cx="768" cy="256" r="170" fill="url(#g)"/><circle cx="256" cy="768" r="130" fill="url(#g)"/><circle cx="768" cy="768" r="90" fill="url(#g)"/></svg>\n`
}

function makeRadianceHdr(width, height) {
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.0000000000000\n\n-Y ${height} +X ${width}\n`, 'ascii')
  const pixels = Buffer.alloc(width * height * 4)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const horizon = 1 - Math.abs((y / (height - 1)) - 0.52)
      const band = Math.max(0, Math.sin((x / width) * Math.PI * 4) * 0.5 + 0.5) * horizon
      const star = ((x * 73 + y * 151) % 997) < 4 ? 175 : 0
      pixels[offset++] = Math.min(255, 8 + Math.floor(25 * band) + star)
      pixels[offset++] = Math.min(255, 10 + Math.floor(42 * band) + star)
      pixels[offset++] = Math.min(255, 28 + Math.floor(95 * band) + star)
      pixels[offset++] = 129
    }
  }
  return Buffer.concat([header, pixels])
}

function makeAmbientWav(durationSeconds, sampleRate) {
  const sampleCount = durationSeconds * sampleRate
  const data = Buffer.alloc(sampleCount * 2)
  let seed = 0x13579bdf
  for (let i = 0; i < sampleCount; i += 1) {
    seed = (1664525 * seed + 1013904223) >>> 0
    const noise = ((seed / 0xffffffff) * 2 - 1) * 0.025
    const t = i / sampleRate
    const fade = Math.min(1, t / 1.2, (durationSeconds - t) / 1.2)
    const tone = Math.sin(t * Math.PI * 2 * 55) * 0.13 + Math.sin(t * Math.PI * 2 * 82.5) * 0.07 + Math.sin(t * Math.PI * 2 * 110) * 0.035
    const sample = Math.max(-1, Math.min(1, (tone + noise) * Math.max(0, fade)))
    data.writeInt16LE(Math.round(sample * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

function box(name, center, scale, material) { return { name, type: 'box', center, scale, material } }
function torus(name, radius, tube, center, material, rotation = [0, 0, 0]) { return { name, type: 'torus', radius, tube, center, material, rotation } }
function sphere(name, center, radius, material, widthSegments = 20, heightSegments = 14) { return { name, type: 'sphere', center, radius, material, widthSegments, heightSegments } }

function buildGlb(sceneName, specs) {
  const materials = [
    material('obsidian', [0.02, 0.025, 0.05, 1], [0.0, 0.02, 0.04], 0.72, 0.24),
    material('cyan-energy', [0.08, 0.75, 1, 0.72], [0.0, 0.9, 1.0], 0.08, 0.1, 'BLEND'),
    material('violet-energy', [0.48, 0.24, 1, 0.68], [0.55, 0.18, 1.0], 0.05, 0.12, 'BLEND'),
    material('provenance-gold', [1, 0.62, 0.2, 1], [0.5, 0.22, 0.04], 0.55, 0.18),
    material('aura-glass', [0.2, 0.55, 1, 0.18], [0.08, 0.24, 0.8], 0.02, 0.05, 'BLEND'),
  ]
  const meshes = []
  const nodes = []
  const chunks = []
  for (const spec of specs) {
    const primitive = spec.type === 'box' ? createBox(spec.center, spec.scale) : spec.type === 'torus' ? createTorus(spec.radius, spec.tube, spec.center, 48, 8) : createSphere(spec.center, spec.radius, spec.widthSegments, spec.heightSegments)
    const meshIndex = meshes.length
    chunks.push(primitive)
    meshes.push({ name: spec.name, primitives: [{ attributes: { POSITION: null, NORMAL: null }, indices: null, material: spec.material }] })
    nodes.push({ name: spec.name, mesh: meshIndex, rotation: spec.rotation })
  }
  const binParts = []
  const bufferViews = []
  const accessors = []
  let byteOffset = 0
  const append = (typedArray, target, accessor) => {
    const bytes = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength)
    const aligned = align4(byteOffset)
    if (aligned > byteOffset) binParts.push(Buffer.alloc(aligned - byteOffset))
    byteOffset = aligned
    const bufferView = bufferViews.length
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, target })
    binParts.push(bytes)
    byteOffset += bytes.length
    accessors.push({ bufferView, ...accessor })
    return accessors.length - 1
  }
  chunks.forEach((primitive, index) => {
    const positions = new Float32Array(primitive.positions)
    const normals = new Float32Array(primitive.normals)
    const indices = new Uint16Array(primitive.indices)
    const positionAccessor = append(positions, 34962, { componentType: 5126, count: positions.length / 3, type: 'VEC3', min: minVec3(positions), max: maxVec3(positions) })
    const normalAccessor = append(normals, 34962, { componentType: 5126, count: normals.length / 3, type: 'VEC3' })
    const indexAccessor = append(indices, 34963, { componentType: 5123, count: indices.length, type: 'SCALAR', min: [0], max: [Math.max(...indices)] })
    meshes[index].primitives[0].attributes.POSITION = positionAccessor
    meshes[index].primitives[0].attributes.NORMAL = normalAccessor
    meshes[index].primitives[0].indices = indexAccessor
  })
  const bin = Buffer.concat(binParts)
  return encodeGlb({ asset: { version: '2.0', generator: 'URAI launch-critical deterministic candidate forge' }, scene: 0, scenes: [{ name: sceneName, nodes: nodes.map((_, index) => index) }], nodes, meshes, materials, buffers: [{ byteLength: bin.length }], bufferViews, accessors }, bin)
}

function material(name, baseColorFactor, emissiveFactor, metallicFactor, roughnessFactor, alphaMode = 'OPAQUE') {
  return { name, pbrMetallicRoughness: { baseColorFactor, metallicFactor, roughnessFactor }, emissiveFactor, alphaMode, doubleSided: true }
}

function createBox(center, scale) {
  const [cx, cy, cz] = center
  const [sx, sy, sz] = scale.map((value) => value / 2)
  const points = [[cx - sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz - sz], [cx + sx, cy + sy, cz - sz], [cx - sx, cy + sy, cz - sz], [cx - sx, cy - sy, cz + sz], [cx + sx, cy - sy, cz + sz], [cx + sx, cy + sy, cz + sz], [cx - sx, cy + sy, cz + sz]]
  const faces = [[0, 1, 2, 3, [0, 0, -1]], [4, 7, 6, 5, [0, 0, 1]], [0, 4, 5, 1, [0, -1, 0]], [3, 2, 6, 7, [0, 1, 0]], [1, 5, 6, 2, [1, 0, 0]], [0, 3, 7, 4, [-1, 0, 0]]]
  const positions = [], normals = [], indices = []
  for (const face of faces) {
    const base = positions.length / 3
    for (let index = 0; index < 4; index += 1) { positions.push(...points[face[index]]); normals.push(...face[4]) }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return { positions, normals, indices }
}

function createTorus(radius, tube, center, radialSegments, tubeSegments) {
  const [cx, cy, cz] = center
  const positions = [], normals = [], indices = []
  for (let i = 0; i < radialSegments; i += 1) {
    const u = (i / radialSegments) * Math.PI * 2
    for (let j = 0; j < tubeSegments; j += 1) {
      const v = (j / tubeSegments) * Math.PI * 2
      const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v)
      positions.push(cx + (radius + tube * cv) * cu, cy + (radius + tube * cv) * su, cz + tube * sv)
      normals.push(cv * cu, cv * su, sv)
    }
  }
  for (let i = 0; i < radialSegments; i += 1) {
    const nextI = (i + 1) % radialSegments
    for (let j = 0; j < tubeSegments; j += 1) {
      const nextJ = (j + 1) % tubeSegments
      const a = i * tubeSegments + j, b = nextI * tubeSegments + j, c = nextI * tubeSegments + nextJ, d = i * tubeSegments + nextJ
      indices.push(a, b, c, a, c, d)
    }
  }
  return { positions, normals, indices }
}

function createSphere(center, radius, widthSegments, heightSegments) {
  const [cx, cy, cz] = center
  const positions = [], normals = [], indices = []
  for (let y = 0; y <= heightSegments; y += 1) {
    const v = y / heightSegments
    const phi = v * Math.PI
    for (let x = 0; x <= widthSegments; x += 1) {
      const u = x / widthSegments
      const theta = u * Math.PI * 2
      const nx = Math.sin(phi) * Math.cos(theta), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(theta)
      positions.push(cx + nx * radius, cy + ny * radius, cz + nz * radius)
      normals.push(nx, ny, nz)
    }
  }
  for (let y = 0; y < heightSegments; y += 1) {
    for (let x = 0; x < widthSegments; x += 1) {
      const a = y * (widthSegments + 1) + x
      const b = a + widthSegments + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  return { positions, normals, indices }
}

function encodeGlb(json, bin) {
  const jsonBuffer = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20)
  const binBuffer = pad4(bin, 0)
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

function readGlbJson(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic')
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim())
}

function pad4(buffer, padByte) { const pad = (4 - (buffer.length % 4)) % 4; return pad ? Buffer.concat([buffer, Buffer.alloc(pad, padByte)]) : buffer }
function align4(value) { return value + ((4 - (value % 4)) % 4) }
function minVec3(array) { const out = [Infinity, Infinity, Infinity]; for (let i = 0; i < array.length; i += 3) for (let j = 0; j < 3; j += 1) out[j] = Math.min(out[j], array[i + j]); return out }
function maxVec3(array) { const out = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < array.length; i += 3) for (let j = 0; j < 3; j += 1) out[j] = Math.max(out[j], array[i + j]); return out }
