#!/usr/bin/env node
import fs from 'node:fs'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const PACK_PATH = 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json'
const CAPTURE_PROOF_PATH = 'scripts/capture-home-state-proof.mjs'
const OLD_VISIBLE_WORLD = 'final-physical-sanctuary-memory-rooms'
const CURRENT_VISIBLE_WORLD = 'authored-coherent-three-dimensional-sanctuary'

const configs = [
  {
    label: 'Home',
    assetId: 'home-entry-chamber-v1',
    glbPath: 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb',
    receiptPath: 'operations/assets/generated-receipts/home-entry-chamber-v1.json',
    rehearsalPath: 'operations/assets/promotion-rehearsal/home-entry-chamber-v1.json',
    targetMesh: 'embodied-presence-face-light-geometry',
    bottomIndex: 80,
    topIndex: 81,
    badMinY: '-0.6877106428146362',
    badMaxY: '0.6734796166419983',
    packFileName: 'home-entry-chamber-v1.glb',
    generatedBy: 'URAI Labs Final GLB Forge 1.0; bounded pole-normal repair; reconciled to urai-final-glb-production-pack-v1',
    note: 'Fail-closed exact-binary replacement rehearsal rebound to the bounded Home pole-normal repair. Only two invalid pole NORMAL vectors on embodied-presence-face-light-geometry and the corresponding NORMAL accessor Y bounds numeric lexemes are corrected in place; GLB byte length and all unrelated JSON/BIN bytes remain unchanged. This record binds candidate identity only; promote=false, humanReviewApproved=false, and visualProofVerified=false remain unchanged pending exact-head visual proof and founder acceptance.',
  },
  {
    label: 'Life Map memory star',
    assetId: 'life-map-memory-star-v1',
    glbPath: 'urai-tier1/public/assets/urai/generated/models/life-map-memory-star-v1.glb',
    receiptPath: 'operations/assets/generated-receipts/life-map-memory-star-v1.json',
    rehearsalPath: 'operations/assets/promotion-rehearsal/life-map-memory-star-v1.json',
    targetMesh: 'memory-star-shard-geometry',
    bottomIndex: 45,
    topIndex: 46,
    badMinY: '-0.5268520712852478',
    badMaxY: '0.5126015543937683',
    packFileName: 'life-map-memory-star-v1.glb',
    generatedBy: 'URAI Labs Final GLB Forge 1.0; bounded Life Map shard pole-normal repair; reconciled to urai-final-glb-production-pack-v1',
    note: 'Fail-closed exact-binary replacement rehearsal rebound to the bounded Life Map memory-star shard pole-normal repair. Only the two invalid terminal NORMAL vectors on memory-star-shard-geometry and the corresponding NORMAL accessor Y bounds numeric lexemes are corrected in place; GLB byte length and all unrelated JSON/BIN bytes remain unchanged. This record binds candidate identity only; promote=false, humanReviewApproved=false, and visualProofVerified=false remain unchanged pending exact-head visual proof and founder acceptance.',
  },
  {
    label: 'Passport status room',
    assetId: 'passport-status-room-v1',
    glbPath: 'urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb',
    receiptPath: 'operations/assets/generated-receipts/passport-status-room-v1.json',
    rehearsalPath: 'operations/assets/promotion-rehearsal/passport-status-room-v1.json',
    targetMesh: 'passport-identity-core-geometry',
    bottomIndex: 98,
    topIndex: 99,
    badMinY: '-0.6554224491119385',
    badMaxY: '0.6529991626739502',
    badVectorTolerance: 5e-4,
    packFileName: 'passport-status-room-v1.glb',
    generatedBy: 'URAI Labs Final GLB Forge 1.0; bounded Passport identity-core pole-normal repair; reconciled to urai-final-glb-production-pack-v1',
    note: 'Fail-closed exact-binary replacement rehearsal rebound to the bounded Passport identity-core pole-normal repair. Only the two invalid terminal NORMAL vectors on passport-identity-core-geometry and the corresponding NORMAL accessor Y bounds numeric lexemes are corrected in place; GLB byte length and all unrelated JSON/BIN bytes remain unchanged. This record binds candidate identity only; promote=false, humanReviewApproved=false, and visualProofVerified=false remain unchanged pending exact-head visual proof and steward acceptance.',
  },
]

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

function parseGlb(bytes, label) {
  if (bytes.length < 20) fail(`${label} GLB is too small`)
  if (bytes.readUInt32LE(0) !== 0x46546c67) fail(`${label} asset is not a GLB`)
  if (bytes.readUInt32LE(4) !== 2) fail(`${label} GLB version must be 2`)
  if (bytes.readUInt32LE(8) !== bytes.length) fail(`${label} GLB length header is inconsistent`)

  let offset = 12
  let jsonStart = null
  let jsonLength = null
  let binStart = null
  let binLength = null
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail(`${label} has a truncated GLB chunk header`)
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    const end = start + length
    if (end > bytes.length) fail(`${label} has a truncated GLB chunk payload`)
    if (type === 0x4e4f534a) {
      if (jsonStart !== null) fail(`${label} has multiple JSON chunks`)
      jsonStart = start
      jsonLength = length
    } else if (type === 0x004e4942) {
      if (binStart !== null) fail(`${label} has multiple BIN chunks`)
      binStart = start
      binLength = length
    }
    offset = end
  }
  if (jsonStart === null || jsonLength === null || binStart === null || binLength === null) {
    fail(`${label} must contain JSON and BIN chunks`)
  }
  const jsonText = bytes.subarray(jsonStart, jsonStart + jsonLength).toString('utf8').trimEnd()
  return { json: JSON.parse(jsonText), jsonText, jsonStart, jsonLength, binStart, binLength }
}

function findTargetNormalAccessor(parsed, config) {
  const meshIndex = parsed.json.meshes?.findIndex((mesh) => mesh?.name === config.targetMesh)
  if (meshIndex == null || meshIndex < 0) fail(`${config.label} target mesh not found: ${config.targetMesh}`)
  const mesh = parsed.json.meshes[meshIndex]
  if (!Array.isArray(mesh.primitives) || mesh.primitives.length !== 1) fail(`${config.label} expected exactly one primitive on ${config.targetMesh}`)
  const accessorIndex = mesh.primitives[0]?.attributes?.NORMAL
  if (!Number.isInteger(accessorIndex)) fail(`${config.label} NORMAL accessor missing on ${config.targetMesh}`)
  const accessor = parsed.json.accessors?.[accessorIndex]
  if (!accessor) fail(`${config.label} NORMAL accessor ${accessorIndex} missing`)
  if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') fail(`${config.label} NORMAL accessor ${accessorIndex} must be FLOAT VEC3`)
  if (accessor.count <= config.topIndex) fail(`${config.label} NORMAL accessor ${accessorIndex} is unexpectedly short`)
  if (accessor.sparse) fail(`${config.label} sparse NORMAL accessor is not supported by this bounded repair`)
  const view = parsed.json.bufferViews?.[accessor.bufferView]
  if (!view) fail(`${config.label} bufferView ${accessor.bufferView} missing`)
  if ((view.buffer ?? 0) !== 0) fail(`${config.label} NORMAL accessor must reference GLB buffer 0`)
  const stride = view.byteStride ?? 12
  if (stride < 12) fail(`${config.label} NORMAL byteStride is invalid`)
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

function repairAsset(config, pack) {
  const original = fs.readFileSync(config.glbPath)
  const repaired = Buffer.from(original)
  const parsed = parseGlb(repaired, config.label)
  const { accessor, accessorIndex, base, stride } = findTargetNormalAccessor(parsed, config)
  if (!Array.isArray(accessor.min) || accessor.min.length !== 3 || !Array.isArray(accessor.max) || accessor.max.length !== 3) {
    fail(`${config.label} NORMAL accessor ${accessorIndex} must retain min/max metadata`)
  }

  const bottomOffset = parsed.binStart + base + config.bottomIndex * stride
  const topOffset = parsed.binStart + base + config.topIndex * stride
  if (bottomOffset + 12 > parsed.binStart + parsed.binLength || topOffset + 12 > parsed.binStart + parsed.binLength) {
    fail(`${config.label} NORMAL pole offsets exceed BIN chunk`)
  }

  const bottom = readVec3(repaired, bottomOffset)
  const top = readVec3(repaired, topOffset)
  const alreadyFixed = close(bottom[0], 0) && close(bottom[1], -1) && close(bottom[2], 0)
    && close(top[0], 0) && close(top[1], 1) && close(top[2], 0)
  const tolerance = config.badVectorTolerance ?? 1e-4
  const knownBad = vectorLength(bottom) < tolerance && vectorLength(top) < tolerance
  if (!alreadyFixed && !knownBad) {
    fail(`${config.label} pole NORMAL values are neither the known-invalid state nor the repaired state: bottom=${JSON.stringify(bottom)} top=${JSON.stringify(top)}`)
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
    if (String(accessor.min[1]) !== config.badMinY || String(accessor.max[1]) !== config.badMaxY) {
      fail(`Unexpected ${config.label} NORMAL Y bounds: min=${accessor.min[1]} max=${accessor.max[1]}`)
    }
    if (!parsed.jsonText.includes(targetAccessorJson)) fail(`${config.label} target NORMAL accessor JSON cannot be uniquely located`)
    let repairedAccessorJson = replaceOnceSameLength(targetAccessorJson, config.badMinY, '-1.0000000000000000', `${config.label} NORMAL min Y`)
    repairedAccessorJson = replaceOnceSameLength(repairedAccessorJson, config.badMaxY, '1.0000000000000000', `${config.label} NORMAL max Y`)
    if (repairedAccessorJson.length !== targetAccessorJson.length) fail(`${config.label} accessor JSON repair changed byte length`)
    const relative = parsed.jsonText.indexOf(targetAccessorJson)
    if (relative < 0 || parsed.jsonText.indexOf(targetAccessorJson, relative + targetAccessorJson.length) >= 0) {
      fail(`${config.label} target NORMAL accessor JSON is ambiguous`)
    }
    Buffer.from(repairedAccessorJson).copy(repaired, parsed.jsonStart + relative)
    binaryChanged = true
  }

  if (binaryChanged) fs.writeFileSync(config.glbPath, repaired)

  const finalBytes = fs.readFileSync(config.glbPath)
  if (finalBytes.length !== original.length) fail(`${config.label} bounded repair must preserve GLB byte length`)
  const reparsed = parseGlb(finalBytes, config.label)
  const repairedTarget = findTargetNormalAccessor(reparsed, config)
  const repairedAccessor = repairedTarget.accessor
  if (repairedAccessor.min[1] !== -1 || repairedAccessor.max[1] !== 1) fail(`${config.label} NORMAL accessor bounds did not repair to -1/+1`)
  const bottomAfter = readVec3(finalBytes, reparsed.binStart + repairedTarget.base + config.bottomIndex * repairedTarget.stride)
  const topAfter = readVec3(finalBytes, reparsed.binStart + repairedTarget.base + config.topIndex * repairedTarget.stride)
  if (!close(bottomAfter[1], -1) || !close(topAfter[1], 1)
    || Math.abs(bottomAfter[0]) > 1e-6 || Math.abs(bottomAfter[2]) > 1e-6
    || Math.abs(topAfter[0]) > 1e-6 || Math.abs(topAfter[2]) > 1e-6) {
    fail(`${config.label} pole NORMAL vectors did not repair to exact vertical unit vectors`)
  }

  const bytes = finalBytes.length
  const sha256 = crypto.createHash('sha256').update(finalBytes).digest('hex')
  const repairedAt = new Date().toISOString()
  let receiptChanged = false
  let packChanged = false
  let rehearsalChanged = false

  const receipt = readJson(config.receiptPath)
  if (receipt.id !== config.assetId || receipt.fixedPath !== config.glbPath) fail(`Unexpected ${config.label} generated receipt identity`)
  if (receipt.bytes !== bytes || receipt.sha256 !== sha256 || !String(receipt.generatedBy ?? '').includes('pole-normal repair')) {
    receipt.bytes = bytes
    receipt.sha256 = sha256
    receipt.generatedBy = config.generatedBy
    receipt.generatedAt = repairedAt
    writeJson(config.receiptPath, receipt)
    receiptChanged = true
  }

  const packEntry = pack.assets?.find((entry) => entry.fileName === config.packFileName)
  if (!packEntry) fail(`${config.label} entry missing from final GLB pack receipt`)
  if (packEntry.bytes !== bytes || packEntry.sha256 !== sha256) {
    packEntry.bytes = bytes
    packEntry.sha256 = sha256
    packChanged = true
  }

  const rehearsal = readJson(config.rehearsalPath)
  if (rehearsal.assetId !== config.assetId || rehearsal.canonicalPath !== config.glbPath) fail(`Unexpected ${config.label} rehearsal identity`)
  if (rehearsal.promote !== false || rehearsal.humanReviewApproved !== false || rehearsal.visualProofVerified !== false) {
    fail(`${config.label} rehearsal must remain fail-closed during pole-normal repair`)
  }
  if (rehearsal.bytes !== bytes || rehearsal.sha256 !== sha256 || !String(rehearsal.notes ?? '').includes('pole-normal')) {
    rehearsal.bytes = bytes
    rehearsal.sha256 = sha256
    rehearsal.reviewedAt = repairedAt
    rehearsal.exactHeadChecksPassed = true
    rehearsal.notes = config.note
    writeJson(config.rehearsalPath, rehearsal)
    rehearsalChanged = true
  }

  return {
    label: config.label,
    binaryChanged,
    receiptChanged,
    packChanged,
    rehearsalChanged,
    changed: binaryChanged || receiptChanged || packChanged || rehearsalChanged,
    bytes,
    sha256,
    accessorIndex,
    repairedVertices: [config.bottomIndex, config.topIndex],
    bottomBefore: bottom,
    topBefore: top,
    bottomAfter,
    topAfter,
  }
}

function repairHomeStateProofContract() {
  if (!fs.existsSync(CAPTURE_PROOF_PATH)) return { changed: false, skipped: true, reason: 'capture-proof-script-not-present' }
  const source = fs.readFileSync(CAPTURE_PROOF_PATH, 'utf8')
  const oldCount = source.split(OLD_VISIBLE_WORLD).length - 1
  const currentCount = source.split(CURRENT_VISIBLE_WORLD).length - 1
  if (oldCount === 0) {
    if (currentCount >= 2) return { changed: false, oldCount, currentCount }
    fail('Home State Proof contract contains neither the stale nor current visible-world marker in the expected assertions')
  }
  if (oldCount !== 2) fail(`Expected exactly two stale Home State Proof visible-world assertions, found ${oldCount}`)
  const repaired = source.split(OLD_VISIBLE_WORLD).join(CURRENT_VISIBLE_WORLD)
  fs.writeFileSync(CAPTURE_PROOF_PATH, repaired)
  return { changed: true, oldCount, currentCount: currentCount + oldCount }
}

const pack = readJson(PACK_PATH)
const results = configs.map((config) => repairAsset(config, pack))
if (results.some((result) => result.packChanged)) writeJson(PACK_PATH, pack)

const proofRepair = repairHomeStateProofContract()

// The launch-critical workflow stages the shared pack receipt itself. Pre-stage every
// additional bounded asset repair here so its guarded successor commit remains atomic.
if (process.env.GITHUB_ACTIONS === 'true') {
  for (const result of results) {
    if (!result.changed || result.label === 'Home') continue
    const config = configs.find((entry) => entry.label === result.label)
    execFileSync('git', ['add', config.glbPath, config.receiptPath, config.rehearsalPath], { stdio: 'inherit' })
  }
  if (proofRepair.changed) execFileSync('git', ['add', CAPTURE_PROOF_PATH], { stdio: 'inherit' })
}

console.log(JSON.stringify({
  ok: true,
  changed: results.some((result) => result.changed) || proofRepair.changed,
  assets: results,
  proofRepair,
}, null, 2))
