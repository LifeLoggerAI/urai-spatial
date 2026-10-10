import fs from 'node:fs'
import crypto from 'node:crypto'
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.mjs'
import { HOME_NORMAL_PREDECESSOR, verifyHomeNormalRepair } from './home-normal-repair.mjs'

export const CANONICAL_HOME_SUCCESSOR = Object.freeze({
  assetId: 'home-entry-chamber-v1',
  path: 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb',
  bytes: 186040,
  sha256: '808d6a7e0a64aa9f69f10aabf8134bd6b5e0f2335afc1e83e21fa11fa2f35e17',
  sourceSha: '51db7b3ba77a657659da34ca5e146e049dd03d31',
  retiredTarget: 'embodied-presence-face-light-geometry',
  normalRepairReceiptPath: 'operations/assets/normal-repair-receipts/home-entry-chamber-v1.json',
  normalRepairReceiptSha256: '5f57bbee1123e418456d13e240fdf5dc9812b2fd017d10292c46fae975d221e4',
})

const MAX_DECODED_BYTES = 16 * 1024 * 1024
const MAX_NORMAL_COUNT = 1_000_000
const NORMAL_UNIT_TOLERANCE = 1e-5
const DECODER_SHA256 = '97901fb3d2d296eeea2a57348a734ef0a17e35f2d4aea5a65223635d3f0e1709'
const fail = (label, reason) => { throw new Error(`${label} normal integrity: ${reason}`) }
const integer = (value, label, reason, minimum = 0) => {
  if (!Number.isSafeInteger(value) || value < minimum) fail(label, reason)
  return value
}

function parse(bytes, label) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) fail(label, 'invalid GLB header')
  let offset = 12, json, bin
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail(label, 'truncated chunk header')
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4), start = offset + 8
    if (length % 4 || start + length > bytes.length) fail(label, 'invalid chunk extent')
    if (type === 0x4e4f534a) {
      if (json || bin) fail(label, 'duplicate or non-leading JSON chunk')
      json = JSON.parse(bytes.subarray(start, start + length).toString('utf8'))
    } else if (type === 0x004e4942) {
      if (!json || bin) fail(label, 'duplicate or non-following BIN chunk')
      bin = bytes.subarray(start, start + length)
    } else fail(label, 'unrecognized GLB chunk')
    offset = start + length
  }
  if (!json || !bin || json.asset?.version !== '2.0') fail(label, 'missing glTF2 JSON/BIN')
  const buffer = json.buffers?.[0]
  if (!buffer || buffer.uri || !Number.isSafeInteger(buffer.byteLength) || buffer.byteLength > bin.length || bin.length - buffer.byteLength > 3) fail(label, 'invalid embedded buffer identity/extent')
  return { json, bin: bin.subarray(0, buffer.byteLength) }
}

export async function verifyGlbNormalIntegrity(bytes, label = 'GLB') {
  const decoderBytes = fs.readFileSync(new URL('../vendor/meshopt_decoder.module.mjs', import.meta.url))
  if (crypto.createHash('sha256').update(decoderBytes).digest('hex') !== DECODER_SHA256) fail(label, 'pinned decoder integrity mismatch')
  const { json, bin } = parse(bytes, label), cache = new Map()
  let decodedBytes = 0, checkedVectors = 0, quantizedVectors = 0, maxQuantizedRawUnitDeviation = 0
  const compressed = new Set(), accessorIndices = new Set()
  if (!Array.isArray(json.meshes) || !json.meshes.length) fail(label, 'no meshes')
  for (const mesh of json.meshes) {
    if (!Array.isArray(mesh.primitives) || !mesh.primitives.length) fail(label, 'mesh has no primitives')
    for (const primitive of mesh.primitives) {
      if (primitive.targets?.some((target) => target.NORMAL != null)) fail(label, 'morph normal deltas require a separate validator')
      const normalIndex = primitive.attributes?.NORMAL, positionIndex = primitive.attributes?.POSITION
      integer(normalIndex, label, 'primitive NORMAL accessor missing')
      integer(positionIndex, label, 'primitive POSITION accessor missing')
      if (json.accessors?.[normalIndex]?.count !== json.accessors?.[positionIndex]?.count) fail(label, 'NORMAL/POSITION counts differ')
      accessorIndices.add(normalIndex)
    }
  }
  async function viewBytes(index) {
    if (cache.has(index)) return cache.get(index)
    const view = json.bufferViews?.[index]
    if (!view) fail(label, 'NORMAL bufferView missing')
    const length = integer(view.byteLength, label, 'invalid bufferView length', 1)
    const extension = view.extensions?.EXT_meshopt_compression
    let output
    if (extension) {
      if (!json.extensionsRequired?.includes('EXT_meshopt_compression') || extension.buffer !== 0) fail(label, 'unbound compressed buffer')
      const start = integer(extension.byteOffset ?? 0, label, 'invalid compressed offset'), size = integer(extension.byteLength, label, 'invalid compressed length', 1)
      const count = integer(extension.count, label, 'invalid compressed count', 1), stride = integer(extension.byteStride, label, 'invalid compressed stride', 1)
      const filter = extension.filter ?? 'NONE'
      if (extension.mode !== 'ATTRIBUTES' || !['NONE', 'OCTAHEDRAL', 'QUATERNION', 'EXPONENTIAL'].includes(filter)) fail(label, 'invalid normal compression mode/filter')
      if (stride % 4 || stride > 256 || (view.byteStride != null && stride !== view.byteStride) || count * stride !== length) fail(label, 'compressed layout mismatch')
      if ((filter === 'OCTAHEDRAL' && ![4, 8].includes(stride)) || (filter === 'QUATERNION' && stride !== 8)) fail(label, 'compressed filter stride mismatch')
      if (start + size > bin.length || decodedBytes + length > MAX_DECODED_BYTES) fail(label, 'compressed bounds/budget exceeded')
      await MeshoptDecoder.ready
      output = Buffer.alloc(length)
      MeshoptDecoder.decodeGltfBuffer(output, count, stride, bin.subarray(start, start + size), extension.mode, filter)
      decodedBytes += length
      compressed.add(index)
    } else {
      const start = integer(view.byteOffset ?? 0, label, 'invalid buffer offset')
      if ((view.buffer ?? 0) !== 0 || start + length > bin.length) fail(label, 'NORMAL bufferView exceeds embedded BIN')
      output = bin.subarray(start, start + length)
    }
    cache.set(index, output)
    return output
  }
  for (const index of accessorIndices) {
    const accessor = json.accessors?.[index]
    if (!accessor || accessor.sparse || accessor.type !== 'VEC3') fail(label, 'unsupported NORMAL accessor')
    const count = integer(accessor.count, label, 'invalid NORMAL count', 1)
    if (count > MAX_NORMAL_COUNT) fail(label, 'NORMAL count exceeds budget')
    const component = accessor.componentType, size = component === 5126 ? 4 : component === 5122 ? 2 : component === 5120 ? 1 : 0
    if (!size || (component === 5126 && accessor.normalized) || (component !== 5126 && (!accessor.normalized || !json.extensionsRequired?.includes('KHR_mesh_quantization')))) fail(label, 'invalid NORMAL component/quantization')
    integer(accessor.bufferView, label, 'invalid NORMAL bufferView')
    const view = json.bufferViews?.[accessor.bufferView]
    if (!view) fail(label, 'NORMAL bufferView missing')
    const data = await viewBytes(accessor.bufferView)
    const offset = integer(accessor.byteOffset ?? 0, label, 'invalid NORMAL accessor offset'), stride = integer(view.byteStride ?? size * 3, label, 'invalid NORMAL stride', 1)
    if (offset % size || stride % size || stride < size * 3 || offset + (count - 1) * stride + size * 3 > data.length) fail(label, 'NORMAL accessor exceeds bufferView')
    if (component !== 5126 && (offset % 4 || stride % 4)) fail(label, 'quantized NORMAL attribute alignment invalid')
    for (const bounds of [accessor.min, accessor.max]) if (bounds != null && (!Array.isArray(bounds) || bounds.length !== 3 || !bounds.every(Number.isFinite))) fail(label, 'invalid NORMAL bounds metadata')
    if ((accessor.min == null) !== (accessor.max == null)) fail(label, 'incomplete NORMAL bounds metadata')
    if (accessor.min && accessor.min.some((value, axis) => value > accessor.max[axis])) fail(label, 'inverted NORMAL bounds metadata')
    for (let vertex = 0; vertex < count; vertex++) {
      const raw = [0, 1, 2].map((axis) => {
        const at = offset + vertex * stride + axis * size
        return component === 5126 ? data.readFloatLE(at) : component === 5122 ? data.readInt16LE(at) : data.readInt8(at)
      })
      if (!raw.every(Number.isFinite)) fail(label, `non-finite NORMAL ${index}:${vertex}`)
      if (accessor.min && raw.some((value, axis) => value < accessor.min[axis] - 1e-5 || value > accessor.max[axis] + 1e-5)) fail(label, `NORMAL ${index}:${vertex} exceeds declared bounds`)
      const vector = component === 5126 ? raw : raw.map((value) => Math.max(-1, value / (component === 5122 ? 32767 : 127)))
      const magnitude = Math.hypot(...vector)
      if (component === 5126) {
        if (Math.abs(magnitude - 1) > NORMAL_UNIT_TOLERANCE) fail(label, `non-unit NORMAL ${index}:${vertex}: ${magnitude}`)
      } else {
        // KHR_mesh_quantization requires applications to normalize quantized
        // normals before lighting: integer quantization does not preserve unit
        // length. Keep raw deviations explicit; never call the raw vectors unit.
        // https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/README.md
        if (magnitude <= 1e-7) fail(label, `zero quantized NORMAL ${index}:${vertex}`)
        const lightingNormal = vector.map((value) => value / magnitude)
        if (Math.abs(Math.hypot(...lightingNormal) - 1) > NORMAL_UNIT_TOLERANCE) fail(label, `invalid normalized lighting NORMAL ${index}:${vertex}`)
        quantizedVectors++
        maxQuantizedRawUnitDeviation = Math.max(maxQuantizedRawUnitDeviation, Math.abs(magnitude - 1))
      }
      checkedVectors++
    }
  }
  return { scope: 'all-base-mesh-normal-accessors', accessorCount: accessorIndices.size, checkedVectors, quantizedVectors, maxQuantizedRawUnitDeviation, quantizedLightingRenormalizationRequired: quantizedVectors > 0, compressedBufferViews: compressed.size, decodedBytes, floatAndLightingUnitTolerance: NORMAL_UNIT_TOLERANCE, decoderSha256: DECODER_SHA256 }
}

export async function verifyCanonicalHomeRepairRetirement(bytes, config, pack, receipt, rehearsal) {
  const identity = CANONICAL_HOME_SUCCESSOR
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  if (config.assetId !== identity.assetId || config.glbPath !== identity.path || config.targetMesh !== identity.retiredTarget || bytes.length !== identity.bytes || sha256 !== identity.sha256) fail('Home successor', 'exact canonical identity mismatch')
  const binding = (record, id, path) => record?.[id[0]] === id[1] && record?.[path[0]] === path[1] && record.bytes === identity.bytes && record.sha256 === identity.sha256
  if (!binding(receipt, ['id', identity.assetId], ['fixedPath', identity.path]) || receipt.releaseState !== 'candidate-not-production-ready' || receipt.measurementReconciliation?.sourceSha !== identity.sourceSha || receipt.measurementReconciliation?.finalReviewGranted !== false) fail('Home successor', 'generated receipt binding mismatch')
  const entries = pack.assets?.filter((entry) => entry.fileName === config.packFileName)
  if (entries?.length !== 1 || entries[0].bytes !== identity.bytes || entries[0].sha256 !== identity.sha256 || entries[0].sourceHead !== identity.sourceSha || entries[0].currentVisualAcceptance !== false) fail('Home successor', 'pack receipt binding mismatch')
  if (!binding(rehearsal, ['assetId', identity.assetId], ['canonicalPath', identity.path]) || rehearsal.mode !== 'rehearsal' || rehearsal.repository !== 'LifeLoggerAI/urai-spatial' || rehearsal.promote !== false || rehearsal.humanReviewApproved !== false || rehearsal.visualProofVerified !== false || rehearsal.exactHeadChecksPassed !== false || rehearsal.receiptPath) fail('Home successor', 'fail-closed rehearsal binding mismatch')
  const currentProduction = JSON.parse(fs.readFileSync('operations/assets/production-receipts/home-entry-chamber-v1.json', 'utf8'))
  const currentDecision = JSON.parse(fs.readFileSync('operations/assets/promotion-decisions/home-entry-chamber-v1.json', 'utf8'))
  if (!binding(currentProduction, ['id', identity.assetId], ['fixedPath', identity.path]) || currentProduction.releaseState !== 'pending-final-review' || currentProduction.visualAcceptance?.accepted !== false || currentProduction.deploymentAuthorized !== false || currentProduction.paidExecutionAuthorized !== false || currentProduction.restoredSource?.bytesChangedFromAcceptedSource !== true || currentProduction.restoredSource?.geometryChangedFromAcceptedSource !== false || currentProduction.restoredSource?.currentReleaseAccepted !== false || currentProduction.historicalPredecessorIdentity?.sha256 !== HOME_NORMAL_PREDECESSOR.sha256) fail('Home successor', 'non-authorizing production receipt mismatch')
  if (!binding(currentDecision, ['assetId', identity.assetId], ['canonicalPath', identity.path]) || currentDecision.mode !== 'rehearsal' || currentDecision.promote !== false || currentDecision.humanReviewApproved !== false || currentDecision.visualProofVerified !== false || currentDecision.exactHeadChecksPassed !== false || currentDecision.deploymentAuthorized !== false || currentDecision.paidExecutionAuthorized !== false || currentDecision.receiptPath || currentDecision.historicalPromotion?.sha256 !== HOME_NORMAL_PREDECESSOR.sha256 || currentDecision.historicalPromotion?.bytes !== HOME_NORMAL_PREDECESSOR.bytes) fail('Home successor', 'non-authorizing promotion decision mismatch')
  for (const record of [receipt, entries[0], rehearsal, currentProduction, currentDecision]) {
    const repair = record.normalRepair
    if (repair?.receiptPath !== identity.normalRepairReceiptPath || repair.receiptSha256 !== identity.normalRepairReceiptSha256 || repair.predecessorPath !== HOME_NORMAL_PREDECESSOR.archivePath || repair.predecessorBytes !== HOME_NORMAL_PREDECESSOR.bytes || repair.predecessorSha256 !== HOME_NORMAL_PREDECESSOR.sha256 || repair.candidateBytes !== identity.bytes || repair.candidateSha256 !== identity.sha256 || repair.visualAcceptance !== false || repair.humanReviewApproved !== false || repair.deviceAcceptance !== false || repair.productionPromotion !== false || repair.exactHeadChecksPassed !== false) fail('Home successor', 'normal repair receipt binding mismatch')
  }
  const proofBytes = fs.readFileSync(identity.normalRepairReceiptPath)
  if (crypto.createHash('sha256').update(proofBytes).digest('hex') !== identity.normalRepairReceiptSha256) fail('Home successor', 'normal repair proof integrity mismatch')
  const proof = JSON.parse(proofBytes.toString('utf8'))
  const computed = await verifyHomeNormalRepair(fs.readFileSync(HOME_NORMAL_PREDECESSOR.archivePath), bytes)
  for (const [key, value] of Object.entries(computed)) if (JSON.stringify(proof[key]) !== JSON.stringify(value)) fail('Home successor', `normal repair proof mismatch: ${key}`)
  const normalIntegrity = await verifyGlbNormalIntegrity(bytes, 'Home successor')
  if (JSON.stringify(proof.normalIntegrity) !== JSON.stringify(normalIntegrity)) fail('Home successor', 'normal repair integrity result mismatch')
  return { label: config.label, disposition: 'NOT_APPLICABLE_EXACT_CANONICAL_SUCCESSOR', retiredTarget: identity.retiredTarget, sourceSha: identity.sourceSha, binaryChanged: false, receiptChanged: false, packChanged: false, rehearsalChanged: false, changed: false, bytes: bytes.length, sha256, normalIntegrity, acceptance: 'candidate-not-production-ready; no visual/human/device approval' }
}
