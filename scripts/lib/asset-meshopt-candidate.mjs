import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { MeshoptEncoder } from '../vendor/meshopt_encoder.module.mjs'
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.mjs'
import { HOME_NORMAL_CODEC } from './home-normal-repair.mjs'

const extensionName = 'EXT_meshopt_compression'
const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const componentWidth = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
export const assetSha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const requireCondition = (condition, message) => { if (!condition) throw new Error(`Meshopt candidate: ${message}`) }
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum

function codecIntegrity() {
  for (const name of ['encoder', 'decoder']) {
    requireCondition(assetSha256(fs.readFileSync(new URL(`../vendor/meshopt_${name}.module.mjs`, import.meta.url))) === HOME_NORMAL_CODEC[`${name}Sha256`], `pinned ${name} integrity mismatch`)
  }
}

function parse(bytes) {
  requireCondition(bytes.length >= 28 && bytes.length <= 32 * 1024 * 1024, 'GLB size outside bounded candidate scope')
  requireCondition(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'invalid GLB header')
  const jsonLength = bytes.readUInt32LE(12), binHeader = 20 + jsonLength
  requireCondition(jsonLength % 4 === 0 && bytes.readUInt32LE(16) === 0x4e4f534a && binHeader + 8 <= bytes.length, 'invalid JSON chunk')
  const binLength = bytes.readUInt32LE(binHeader)
  requireCondition(binLength % 4 === 0 && bytes.readUInt32LE(binHeader + 4) === 0x004e4942 && binHeader + 8 + binLength === bytes.length, 'invalid BIN chunk')
  const json = JSON.parse(bytes.subarray(20, binHeader).toString('utf8'))
  requireCondition(json.asset?.version === '2.0' && Array.isArray(json.bufferViews) && json.bufferViews.length > 0 && Array.isArray(json.accessors), 'missing glTF structure')
  const buffer = json.buffers?.[0]
  requireCondition(buffer && !buffer.uri && integer(buffer.byteLength, 1) && buffer.byteLength <= binLength && binLength - buffer.byteLength <= 3, 'invalid embedded buffer')
  return { json, bin: bytes.subarray(binHeader + 8, binHeader + 8 + buffer.byteLength) }
}

// JSON.stringify erases signed zero in authored node rotations. Preserve every
// parsed JSON number as well as every binary accessor byte in review candidates.
function stringifyExact(value) {
  if (typeof value === 'number' && Object.is(value, -0)) return '-0'
  if (Array.isArray(value)) return `[${value.map(stringifyExact).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}:${stringifyExact(item)}`).join(',')}}`
  return JSON.stringify(value)
}

function encode(json, bin) {
  const text = Buffer.from(stringifyExact(json))
  const jsonChunk = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20), binChunk = Buffer.alloc(Math.ceil(bin.length / 4) * 4)
  text.copy(jsonChunk); bin.copy(binChunk)
  const bytes = Buffer.alloc(28 + jsonChunk.length + binChunk.length)
  bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8)
  bytes.writeUInt32LE(jsonChunk.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(bytes, 20)
  const at = 20 + jsonChunk.length
  bytes.writeUInt32LE(binChunk.length, at); bytes.writeUInt32LE(0x004e4942, at + 4); binChunk.copy(bytes, at + 8)
  return bytes
}

function sourceViews(parsed) {
  requireCondition(parsed.json.buffers.length === 1 && !parsed.json.extensionsUsed?.includes(extensionName), 'source must be an uncompressed single-buffer GLB')
  return parsed.json.bufferViews.map((view, index) => {
    const offset = view.byteOffset ?? 0
    requireCondition((view.buffer ?? 0) === 0 && integer(offset) && integer(view.byteLength, 1) && offset + view.byteLength <= parsed.bin.length && !view.extensions, `unsupported source view ${index}`)
    return parsed.bin.subarray(offset, offset + view.byteLength)
  })
}

function semanticJson(json) {
  const copy = structuredClone(json)
  delete copy.buffers
  for (const field of ['extensionsUsed', 'extensionsRequired']) {
    if (!copy[field]) continue
    copy[field] = copy[field].filter(name => name !== extensionName)
    if (copy[field].length === 0) delete copy[field]
  }
  for (const view of copy.bufferViews) {
    delete view.buffer; delete view.byteOffset; delete view.extensions
  }
  return copy
}

export async function verifyAssetMeshoptCandidate(original, candidate) {
  codecIntegrity()
  const before = parse(original), after = parse(candidate), expected = sourceViews(before)
  requireCondition(after.json.extensionsRequired?.includes(extensionName), 'meshopt must be required')
  requireCondition(after.json.buffers.length === 2 && after.json.buffers[1]?.extensions?.[extensionName]?.fallback === true && !after.json.buffers[1].uri, 'missing virtual fallback buffer')
  assert.deepEqual(semanticJson(after.json), semanticJson(before.json), 'Meshopt candidate changed scene/accessor/image/material/skin/animation metadata')
  await MeshoptDecoder.ready
  let compressedViews = 0, decodedBytes = 0
  for (const [index, view] of after.json.bufferViews.entries()) {
    const extension = view.extensions?.[extensionName]
    let bytes
    if (extension) {
      requireCondition(view.buffer === 1 && integer(view.byteOffset ?? 0) && (view.byteOffset ?? 0) + view.byteLength <= after.json.buffers[1].byteLength, `virtual bounds invalid for view ${index}`)
      requireCondition(extension.buffer === 0 && integer(extension.byteOffset) && integer(extension.byteLength, 1) && extension.byteOffset + extension.byteLength <= after.bin.length, `compressed bounds invalid for view ${index}`)
      requireCondition(integer(extension.count, 1) && integer(extension.byteStride, 1) && extension.count * extension.byteStride === view.byteLength && extension.filter === 'NONE' && ['ATTRIBUTES', 'INDICES'].includes(extension.mode), `unsupported compressed layout ${index}`)
      decodedBytes += view.byteLength
      requireCondition(decodedBytes <= 32 * 1024 * 1024, 'decoded byte budget exceeded')
      bytes = Buffer.alloc(view.byteLength)
      MeshoptDecoder.decodeGltfBuffer(bytes, extension.count, extension.byteStride, after.bin.subarray(extension.byteOffset, extension.byteOffset + extension.byteLength), extension.mode, extension.filter)
      compressedViews++
    } else {
      const offset = view.byteOffset ?? 0
      requireCondition(view.buffer === 0 && integer(offset) && offset + view.byteLength <= after.bin.length, `image/opaque bounds invalid for view ${index}`)
      bytes = after.bin.subarray(offset, offset + view.byteLength)
    }
    requireCondition(bytes.equals(expected[index]), `decoded view ${index} differs from immutable source`)
  }
  return {
    allDecodedViewsIdentical: true, allAccessorArraysAndOrderIdentical: true,
    embeddedImageBytesIdentical: true, sceneMaterialsSkinsAnimationsIdentical: true,
    checkedBufferViews: expected.length, checkedAccessors: before.json.accessors.length,
    compressedViews, decodedBytes,
    source: { bytes: original.length, sha256: assetSha256(original) },
    candidate: { bytes: candidate.length, sha256: assetSha256(candidate) },
    admission: { humanReviewApproved: false, visualAcceptance: false, deviceAcceptance: false, productionPromotion: false, exactHeadChecksPassed: false },
  }
}

export async function deriveAssetMeshoptCandidate(original) {
  codecIntegrity()
  const parsed = parse(original), views = sourceViews(parsed), json = structuredClone(parsed.json)
  const accessorsByView = new Map(), indexAccessors = new Set()
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) if (primitive.indices != null) indexAccessors.add(primitive.indices)
  for (const [index, accessor] of json.accessors.entries()) {
    requireCondition(!accessor.sparse && integer(accessor.bufferView) && views[accessor.bufferView] && (accessor.byteOffset ?? 0) === 0, `unsupported sparse/offset accessor ${index}`)
    requireCondition(!accessorsByView.has(accessor.bufferView), `shared/interleaved accessor view ${accessor.bufferView} requires a separate pipeline`)
    accessorsByView.set(accessor.bufferView, { accessor, index })
  }
  await MeshoptEncoder.ready
  const streams = []
  let physicalBytes = 0, logicalBytes = 0
  function append(bytes) {
    const padding = (4 - physicalBytes % 4) % 4
    if (padding) { streams.push(Buffer.alloc(padding)); physicalBytes += padding }
    const offset = physicalBytes
    streams.push(bytes); physicalBytes += bytes.length
    return offset
  }
  for (const [index, view] of json.bufferViews.entries()) {
    const entry = accessorsByView.get(index)
    if (!entry) { view.buffer = 0; view.byteOffset = append(views[index]); continue }
    const { accessor, index: accessorIndex } = entry
    const stride = componentBytes[accessor.componentType] * componentWidth[accessor.type]
    requireCondition(integer(stride, 1) && integer(accessor.count, 1) && accessor.count * stride === view.byteLength && (view.byteStride == null || view.byteStride === stride), `unsupported accessor stride/extent ${accessorIndex}`)
    const mode = indexAccessors.has(accessorIndex) ? 'INDICES' : 'ATTRIBUTES'
    requireCondition(mode === 'INDICES' ? accessor.type === 'SCALAR' && [2, 4].includes(stride) : stride % 4 === 0 && stride <= 256, `unsupported codec layout ${accessorIndex}`)
    const compressed = Buffer.from(MeshoptEncoder.encodeGltfBuffer(views[index], accessor.count, stride, mode, 0))
    const offset = append(compressed)
    logicalBytes = Math.ceil(logicalBytes / 4) * 4
    view.buffer = 1; view.byteOffset = logicalBytes; logicalBytes += view.byteLength
    view.extensions = { [extensionName]: { buffer: 0, byteOffset: offset, byteLength: compressed.length, byteStride: stride, count: accessor.count, mode, filter: 'NONE' } }
  }
  json.extensionsUsed = [...(json.extensionsUsed ?? []), extensionName]
  json.extensionsRequired = [...(json.extensionsRequired ?? []), extensionName]
  json.buffers = [{ byteLength: physicalBytes }, { byteLength: logicalBytes, extensions: { [extensionName]: { fallback: true } } }]
  const candidate = encode(json, Buffer.concat(streams))
  return { candidate, proof: await verifyAssetMeshoptCandidate(original, candidate) }
}
