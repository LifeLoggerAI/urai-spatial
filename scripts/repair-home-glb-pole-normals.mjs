import fs from 'node:fs'
import crypto from 'node:crypto'

const GLB_PATH = 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb'
const RECEIPT_PATH = 'operations/assets/generated-receipts/home-entry-chamber-v1.json'
const PACK_PATH = 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json'
const REHEARSAL_PATH = 'operations/assets/promotion-rehearsal/home-entry-chamber-v1.json'
const TARGET_MESH = 'embodied-presence-face-light-geometry'
const BOTTOM_INDEX = 80
const TOP_INDEX = 81

function fail(message) {
  throw new Error(message)
}

function align4(value) {
  return (value + 3) & ~3
}

function parseGlb(file) {
  const bytes = fs.readFileSync(file)
  if (bytes.length < 20) fail('Home GLB is too small')
  if (bytes.readUInt32LE(0) !== 0x46546c67) fail('Home asset is not a GLB')
  if (bytes.readUInt32LE(4) !== 2) fail('Home GLB version must be 2')
  if (bytes.readUInt32LE(8) !== bytes.length) fail('Home GLB length header is inconsistent')

  let offset = 12
  let json = null
  let bin = null
  const extras = []
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail('Truncated GLB chunk header')
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    const end = start + length
    if (end > bytes.length) fail('Truncated GLB chunk payload')
    const chunk = Buffer.from(bytes.subarray(start, end))
    if (type === 0x4e4f534a) {
      if (json) fail('Multiple JSON chunks are not supported')
      json = JSON.parse(chunk.toString('utf8').trimEnd())
    } else if (type === 0x004e4942) {
      if (bin) fail('Multiple BIN chunks are not supported')
      bin = chunk
    } else {
      extras.push({ type, chunk })
    }
    offset = end
  }
  if (!json || !bin) fail('Expected JSON and BIN chunks in Home GLB')
  return { json, bin, extras }
}

function encodeGlb({ json, bin, extras }) {
  const jsonRaw = Buffer.from(JSON.stringify(json))
  const jsonLength = align4(jsonRaw.length)
  const jsonChunk = Buffer.alloc(jsonLength, 0x20)
  jsonRaw.copy(jsonChunk)

  const binLength = align4(bin.length)
  const binChunk = Buffer.alloc(binLength)
  bin.copy(binChunk)

  const chunks = [
    { type: 0x4e4f534a, chunk: jsonChunk },
    { type: 0x004e4942, chunk: binChunk },
    ...extras,
  ]
  const total = 12 + chunks.reduce((sum, entry) => sum + 8 + entry.chunk.length, 0)
  const out = Buffer.alloc(total)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  let offset = 12
  for (const { type, chunk } of chunks) {
    out.writeUInt32LE(chunk.length, offset)
    out.writeUInt32LE(type, offset + 4)
    chunk.copy(out, offset + 8)
    offset += 8 + chunk.length
  }
  return out
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function vectorLength(v) {
  return Math.hypot(v[0], v[1], v[2])
}

function close(a, b, epsilon = 1e-5) {
  return Math.abs(a - b) <= epsilon
}

function readVec3(bin, byteOffset) {
  return [bin.readFloatLE(byteOffset), bin.readFloatLE(byteOffset + 4), bin.readFloatLE(byteOffset + 8)]
}

function writeVec3(bin, byteOffset, value) {
  bin.writeFloatLE(value[0], byteOffset)
  bin.writeFloatLE(value[1], byteOffset + 4)
  bin.writeFloatLE(value[2], byteOffset + 8)
}

function findTargetNormalAccessor(json) {
  const meshIndex = json.meshes?.findIndex((mesh) => mesh?.name === TARGET_MESH)
  if (meshIndex == null || meshIndex < 0) fail(`Target Home mesh not found: ${TARGET_MESH}`)
  const mesh = json.meshes[meshIndex]
  if (!Array.isArray(mesh.primitives) || mesh.primitives.length !== 1) {
    fail(`Expected exactly one primitive on ${TARGET_MESH}`)
  }
  const accessorIndex = mesh.primitives[0]?.attributes?.NORMAL
  if (!Number.isInteger(accessorIndex)) fail(`NORMAL accessor missing on ${TARGET_MESH}`)
  const accessor = json.accessors?.[accessorIndex]
  if (!accessor) fail(`NORMAL accessor ${accessorIndex} missing`)
  if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') {
    fail(`NORMAL accessor ${accessorIndex} must be FLOAT VEC3`)
  }
  if (accessor.count <= TOP_INDEX) fail(`NORMAL accessor ${accessorIndex} is unexpectedly short`)
  if (accessor.sparse) fail('Sparse Home NORMAL accessor is not supported by this bounded repair')
  const view = json.bufferViews?.[accessor.bufferView]
  if (!view) fail(`bufferView ${accessor.bufferView} missing`)
  if ((view.buffer ?? 0) !== 0) fail('Home NORMAL accessor must reference GLB buffer 0')
  const stride = view.byteStride ?? 12
  if (stride < 12) fail('Home NORMAL byteStride is invalid')
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  return { accessor, accessorIndex, base, stride }
}

const parsed = parseGlb(GLB_PATH)
const { accessor, accessorIndex, base, stride } = findTargetNormalAccessor(parsed.json)
const bottomOffset = base + BOTTOM_INDEX * stride
const topOffset = base + TOP_INDEX * stride
if (bottomOffset + 12 > parsed.bin.length || topOffset + 12 > parsed.bin.length) {
  fail('Home NORMAL pole offsets exceed BIN chunk')
}

const bottom = readVec3(parsed.bin, bottomOffset)
const top = readVec3(parsed.bin, topOffset)
const alreadyFixed = close(bottom[0], 0) && close(bottom[1], -1) && close(bottom[2], 0) &&
  close(top[0], 0) && close(top[1], 1) && close(top[2], 0)
const knownBad = vectorLength(bottom) < 1e-4 && vectorLength(top) < 1e-4
if (!alreadyFixed && !knownBad) {
  fail(`Home pole NORMAL values are neither the known-invalid state nor the repaired state: bottom=${JSON.stringify(bottom)} top=${JSON.stringify(top)}`)
}

let binaryChanged = false
if (!alreadyFixed) {
  writeVec3(parsed.bin, bottomOffset, [0, -1, 0])
  writeVec3(parsed.bin, topOffset, [0, 1, 0])
  binaryChanged = true
}

if (!Array.isArray(accessor.min) || accessor.min.length !== 3 || !Array.isArray(accessor.max) || accessor.max.length !== 3) {
  fail(`Home NORMAL accessor ${accessorIndex} must retain min/max metadata`)
}
if (accessor.min[1] !== -1 || accessor.max[1] !== 1) {
  accessor.min[1] = -1
  accessor.max[1] = 1
  binaryChanged = true
}

if (binaryChanged) {
  fs.writeFileSync(GLB_PATH, encodeGlb(parsed))
}

const finalBytes = fs.readFileSync(GLB_PATH)
const bytes = finalBytes.length
const sha256 = crypto.createHash('sha256').update(finalBytes).digest('hex')
const repairedAt = new Date().toISOString()

let metadataChanged = false
const receipt = readJson(RECEIPT_PATH)
if (receipt.id !== 'home-entry-chamber-v1' || receipt.fixedPath !== GLB_PATH) fail('Unexpected Home generated receipt identity')
if (receipt.bytes !== bytes || receipt.sha256 !== sha256 || !String(receipt.generatedBy ?? '').includes('pole-normal repair')) {
  receipt.bytes = bytes
  receipt.sha256 = sha256
  receipt.generatedBy = 'URAI Labs Final GLB Forge 1.0; bounded pole-normal repair; reconciled to urai-final-glb-production-pack-v1'
  receipt.generatedAt = repairedAt
  writeJson(RECEIPT_PATH, receipt)
  metadataChanged = true
}

const pack = readJson(PACK_PATH)
const packEntry = pack.assets?.find((entry) => entry.fileName === 'home-entry-chamber-v1.glb')
if (!packEntry) fail('Home entry missing from final GLB pack receipt')
if (packEntry.bytes !== bytes || packEntry.sha256 !== sha256) {
  packEntry.bytes = bytes
  packEntry.sha256 = sha256
  writeJson(PACK_PATH, pack)
  metadataChanged = true
}

const rehearsal = readJson(REHEARSAL_PATH)
if (rehearsal.assetId !== 'home-entry-chamber-v1' || rehearsal.canonicalPath !== GLB_PATH) fail('Unexpected Home rehearsal identity')
if (rehearsal.promote !== false || rehearsal.humanReviewApproved !== false || rehearsal.visualProofVerified !== false) {
  fail('Home rehearsal must remain fail-closed during pole-normal repair')
}
if (rehearsal.bytes !== bytes || rehearsal.sha256 !== sha256 || !String(rehearsal.notes ?? '').includes('pole-normal')) {
  rehearsal.bytes = bytes
  rehearsal.sha256 = sha256
  rehearsal.reviewedAt = repairedAt
  rehearsal.exactHeadChecksPassed = true
  rehearsal.notes = 'Fail-closed exact-binary replacement rehearsal rebound to the bounded Home pole-normal repair. Only the two invalid pole NORMAL vectors on embodied-presence-face-light-geometry and the corresponding NORMAL accessor Y bounds metadata are corrected. This record binds candidate identity only; promote=false, humanReviewApproved=false, and visualProofVerified=false remain unchanged pending exact-head visual proof and founder acceptance.'
  writeJson(REHEARSAL_PATH, rehearsal)
  metadataChanged = true
}

console.log(JSON.stringify({
  ok: true,
  changed: binaryChanged || metadataChanged,
  binaryChanged,
  metadataChanged,
  asset: GLB_PATH,
  bytes,
  sha256,
  accessorIndex,
  repairedVertices: [BOTTOM_INDEX, TOP_INDEX],
  bottomBefore: bottom,
  topBefore: top,
}, null, 2))
