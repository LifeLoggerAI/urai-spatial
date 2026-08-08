import fs from 'node:fs'
import crypto from 'node:crypto'

const GLB_PATH = 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb'
const RECEIPT_PATH = 'operations/assets/generated-receipts/home-entry-chamber-v1.json'
const PACK_PATH = 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json'
const REHEARSAL_PATH = 'operations/assets/promotion-rehearsal/home-entry-chamber-v1.json'
const TARGET_MESH = 'embodied-presence-face-light-geometry'
const BOTTOM_INDEX = 80
const TOP_INDEX = 81
const BAD_MIN_Y = '-0.6877106428146362'
const FIXED_MIN_Y = '-1.0000000000000000'
const BAD_MAX_Y = '0.6734796166419983'
const FIXED_MAX_Y = '1.0000000000000000'

function fail(message) {
  throw new Error(message)
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

function readVec3(bytes, byteOffset) {
  return [bytes.readFloatLE(byteOffset), bytes.readFloatLE(byteOffset + 4), bytes.readFloatLE(byteOffset + 8)]
}

function writeVec3(bytes, byteOffset, value) {
  bytes.writeFloatLE(value[0], byteOffset)
  bytes.writeFloatLE(value[1], byteOffset + 4)
  bytes.writeFloatLE(value[2], byteOffset + 8)
}

function parseGlb(bytes) {
  if (bytes.length < 20) fail('Home GLB is too small')
  if (bytes.readUInt32LE(0) !== 0x46546c67) fail('Home asset is not a GLB')
  if (bytes.readUInt32LE(4) !== 2) fail('Home GLB version must be 2')
  if (bytes.readUInt32LE(8) !== bytes.length) fail('Home GLB length header is inconsistent')

  let offset = 12
  let jsonStart = null
  let jsonLength = null
  let binStart = null
  let binLength = null
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail('Truncated GLB chunk header')
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    const end = start + length
    if (end > bytes.length) fail('Truncated GLB chunk payload')
    if (type === 0x4e4f534a) {
      if (jsonStart !== null) fail('Multiple JSON chunks are not supported')
      jsonStart = start
      jsonLength = length
    } else if (type === 0x004e4942) {
      if (binStart !== null) fail('Multiple BIN chunks are not supported')
      binStart = start
      binLength = length
    }
    offset = end
  }
  if (jsonStart === null || jsonLength === null || binStart === null || binLength === null) {
    fail('Expected JSON and BIN chunks in Home GLB')
  }
  const jsonText = bytes.subarray(jsonStart, jsonStart + jsonLength).toString('utf8').trimEnd()
  return { json: JSON.parse(jsonText), jsonText, jsonStart, jsonLength, binStart, binLength }
}

function findTargetNormalAccessor(json) {
  const meshIndex = json.meshes?.findIndex((mesh) => mesh?.name === TARGET_MESH)
  if (meshIndex == null || meshIndex < 0) fail(`Target Home mesh not found: ${TARGET_MESH}`)
  const mesh = json.meshes[meshIndex]
  if (!Array.isArray(mesh.primitives) || mesh.primitives.length !== 1) fail(`Expected exactly one primitive on ${TARGET_MESH}`)
  const accessorIndex = mesh.primitives[0]?.attributes?.NORMAL
  if (!Number.isInteger(accessorIndex)) fail(`NORMAL accessor missing on ${TARGET_MESH}`)
  const accessor = json.accessors?.[accessorIndex]
  if (!accessor) fail(`NORMAL accessor ${accessorIndex} missing`)
  if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') fail(`NORMAL accessor ${accessorIndex} must be FLOAT VEC3`)
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

function replaceOnceSameLength(text, before, after, label) {
  if (before.length !== after.length) fail(`${label} replacement must preserve JSON chunk length`)
  const first = text.indexOf(before)
  if (first < 0) fail(`${label} source value not found in target accessor JSON`)
  if (text.indexOf(before, first + before.length) >= 0) fail(`${label} source value is ambiguous in target accessor JSON`)
  return text.slice(0, first) + after + text.slice(first + before.length)
}

const original = fs.readFileSync(GLB_PATH)
const repaired = Buffer.from(original)
const parsed = parseGlb(repaired)
const { accessor, accessorIndex, base, stride } = findTargetNormalAccessor(parsed.json)
if (!Array.isArray(accessor.min) || accessor.min.length !== 3 || !Array.isArray(accessor.max) || accessor.max.length !== 3) {
  fail(`Home NORMAL accessor ${accessorIndex} must retain min/max metadata`)
}

const bottomOffset = parsed.binStart + base + BOTTOM_INDEX * stride
const topOffset = parsed.binStart + base + TOP_INDEX * stride
if (bottomOffset + 12 > parsed.binStart + parsed.binLength || topOffset + 12 > parsed.binStart + parsed.binLength) {
  fail('Home NORMAL pole offsets exceed BIN chunk')
}

const bottom = readVec3(repaired, bottomOffset)
const top = readVec3(repaired, topOffset)
const alreadyFixed = close(bottom[0], 0) && close(bottom[1], -1) && close(bottom[2], 0) &&
  close(top[0], 0) && close(top[1], 1) && close(top[2], 0)
const knownBad = vectorLength(bottom) < 1e-4 && vectorLength(top) < 1e-4
if (!alreadyFixed && !knownBad) {
  fail(`Home pole NORMAL values are neither the known-invalid state nor the repaired state: bottom=${JSON.stringify(bottom)} top=${JSON.stringify(top)}`)
}

let binaryChanged = false
if (!alreadyFixed) {
  writeVec3(repaired, bottomOffset, [0, -1, 0])
  writeVec3(repaired, topOffset, [0, 1, 0])
  binaryChanged = true
}

const targetAccessorJson = JSON.stringify(accessor)
const fixedBounds = accessor.min[1] === -1 && accessor.max[1] === 1
if (!fixedBounds) {
  if (String(accessor.min[1]) !== BAD_MIN_Y || String(accessor.max[1]) !== BAD_MAX_Y) {
    fail(`Unexpected Home NORMAL Y bounds: min=${accessor.min[1]} max=${accessor.max[1]}`)
  }
  if (!parsed.jsonText.includes(targetAccessorJson)) fail('Target Home NORMAL accessor JSON cannot be uniquely located')
  let repairedAccessorJson = replaceOnceSameLength(targetAccessorJson, BAD_MIN_Y, FIXED_MIN_Y, 'Home NORMAL min Y')
  repairedAccessorJson = replaceOnceSameLength(repairedAccessorJson, BAD_MAX_Y, FIXED_MAX_Y, 'Home NORMAL max Y')
  if (repairedAccessorJson.length !== targetAccessorJson.length) fail('Home accessor JSON repair changed byte length')
  const relative = parsed.jsonText.indexOf(targetAccessorJson)
  if (relative < 0 || parsed.jsonText.indexOf(targetAccessorJson, relative + targetAccessorJson.length) >= 0) {
    fail('Target Home NORMAL accessor JSON is ambiguous')
  }
  Buffer.from(repairedAccessorJson).copy(repaired, parsed.jsonStart + relative)
  binaryChanged = true
}

if (binaryChanged) fs.writeFileSync(GLB_PATH, repaired)

const finalBytes = fs.readFileSync(GLB_PATH)
if (finalBytes.length !== original.length) fail('Bounded Home repair must preserve GLB byte length')
const reparsed = parseGlb(finalBytes)
const repairedAccessor = findTargetNormalAccessor(reparsed.json).accessor
if (repairedAccessor.min[1] !== -1 || repairedAccessor.max[1] !== 1) fail('Home NORMAL accessor bounds did not repair to -1/+1')
const bottomAfter = readVec3(finalBytes, bottomOffset)
const topAfter = readVec3(finalBytes, topOffset)
if (!close(bottomAfter[1], -1) || !close(topAfter[1], 1) || Math.abs(bottomAfter[0]) > 1e-6 || Math.abs(bottomAfter[2]) > 1e-6 || Math.abs(topAfter[0]) > 1e-6 || Math.abs(topAfter[2]) > 1e-6) {
  fail('Home pole NORMAL vectors did not repair to exact vertical unit vectors')
}

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
  rehearsal.notes = 'Fail-closed exact-binary replacement rehearsal rebound to the bounded Home pole-normal repair. Only two invalid pole NORMAL vectors on embodied-presence-face-light-geometry and the corresponding NORMAL accessor Y bounds numeric lexemes are corrected in place; GLB byte length and all unrelated JSON/BIN bytes remain unchanged. This record binds candidate identity only; promote=false, humanReviewApproved=false, and visualProofVerified=false remain unchanged pending exact-head visual proof and founder acceptance.'
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
  bottomAfter,
  topAfter,
}, null, 2))
