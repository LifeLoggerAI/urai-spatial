import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { inspectGroundGlbAnchors } from '../scripts/lib/ground-glb-source-anchors.mjs'

// Read the original committed Ground asset, not a fabricated Node fixture.
// This proof is structural and byte-provenanced; never a rendering/art certificate.
const modelUrl = new URL('../urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb', import.meta.url)
const sourceUrl = new URL('../urai-tier1/src/app/ground/GroundWorldModel.ts', import.meta.url)
const receiptUrl = new URL('../operations/assets/generated-receipts/urai-final-glb-pack-v1.json', import.meta.url)

export function parseGroundGlbBinary(binary) {
  assert.ok(Buffer.isBuffer(binary) && binary.length >= 28, 'GROUND_GLB_BINARY_TOO_SMALL')
  assert.equal(binary.readUInt32LE(0), 0x46546c67, 'GROUND_GLB_BAD_MAGIC')
  assert.equal(binary.readUInt32LE(4), 2, 'GROUND_GLB_BAD_VERSION')
  assert.equal(binary.readUInt32LE(8), binary.length, 'GROUND_GLB_BAD_TOTAL_SIZE')
  const jsonLength = binary.readUInt32LE(12)
  assert.ok(jsonLength > 0 && jsonLength % 4 === 0 && jsonLength <= binary.length - 28, 'GROUND_GLB_JSON_BOUNDS_INVALID')
  assert.equal(binary.readUInt32LE(16), 0x4e4f534a, 'GROUND_GLB_JSON_CHUNK_MISSING')
  const binHeader = 20 + jsonLength
  assert.ok(binHeader + 8 <= binary.length, 'GROUND_GLB_BIN_HEADER_MISSING')
  const binLength = binary.readUInt32LE(binHeader)
  assert.equal(binary.readUInt32LE(binHeader + 4), 0x004e4942, 'GROUND_GLB_BIN_CHUNK_MISSING')
  assert.equal(binHeader + 8 + binLength, binary.length, 'GROUND_GLB_BIN_LENGTH_INVALID')
  const document = JSON.parse(binary.subarray(20, binHeader).toString('utf8').trim())
  assert.equal(document?.asset?.version, '2.0', 'GROUND_GLB_DOCUMENT_VERSION_INVALID')
  assert.ok(Array.isArray(document.buffers) && document.buffers.length === 1, 'GROUND_GLB_BUFFER_COUNT_INVALID')
  assert.ok(Number.isSafeInteger(document.buffers[0].byteLength) &&
    document.buffers[0].byteLength > 0 && document.buffers[0].byteLength <= binLength,
  'GROUND_GLB_BUFFER_BYTES_INVALID')
  return document
}

// Validate the actual BIN payload: glTF min/max metadata alone can lie.
// This stays a structural receipt, not a GPU-render or release certificate.
export function inspectGroundIndexPayload(document, binary) {
  assert.ok(Buffer.isBuffer(binary), 'GROUND_GLB_INDEX_BINARY_REQUIRED')
  const jsonLength = binary.readUInt32LE(12)
  const binOffset = 20 + jsonLength + 8
  const binLength = binary.readUInt32LE(20 + jsonLength)
  assert.ok(Array.isArray(document?.meshes) && document.meshes.length > 0,
    'GROUND_GLB_INDEX_MESHES_MISSING')
  const sizes = { 5121: 1, 5123: 2, 5125: 4 }
  let primitives = 0, indices = 0
  for (const mesh of document.meshes) {
    assert.ok(Array.isArray(mesh?.primitives) && mesh.primitives.length > 0,
      'GROUND_GLB_INDEX_PRIMITIVES_MISSING')
    for (const primitive of mesh.primitives) {
      assert.equal(primitive?.mode ?? 4, 4, 'GROUND_GLB_INDEX_NON_TRIANGLE')
      const vertices = document.accessors?.[primitive?.attributes?.POSITION]
      const accessor = document.accessors?.[primitive?.indices]
      assert.ok(vertices?.type === 'VEC3' && Number.isSafeInteger(vertices.count) &&
        vertices.count >= 3, 'GROUND_GLB_INDEX_POSITIONS_INVALID')
      assert.ok(accessor?.type === 'SCALAR' && Number.isSafeInteger(accessor.count) &&
        accessor.count >= 3 && accessor.count % 3 === 0 && sizes[accessor.componentType],
      'GROUND_GLB_INDEX_ACCESSOR_INVALID')
      const width = sizes[accessor.componentType]
      const view = document.bufferViews?.[accessor.bufferView]
      const viewOffset = view?.byteOffset ?? 0
      const accessorOffset = accessor.byteOffset ?? 0
      const stride = view?.byteStride ?? width
      assert.ok(view?.buffer === 0 && Number.isSafeInteger(viewOffset) && viewOffset >= 0 &&
        Number.isSafeInteger(view.byteLength) && view.byteLength > 0 &&
        Number.isSafeInteger(accessorOffset) && accessorOffset >= 0 &&
        Number.isSafeInteger(stride) && stride >= width &&
        viewOffset + view.byteLength <= binLength &&
        accessorOffset + (accessor.count - 1) * stride + width <= view.byteLength &&
        (viewOffset + accessorOffset) % width === 0,
      'GROUND_GLB_INDEX_VIEW_BOUNDS_INVALID')
      let smallest = Infinity, largest = -Infinity
      const base = binOffset + viewOffset + accessorOffset
      for (let i=0; i<accessor.count; i++) {
        const at = base + i * stride
        const value = width === 4 ? binary.readUInt32LE(at) :
          width === 2 ? binary.readUInt16LE(at) : binary.readUInt8(at)
        assert.ok(value < vertices.count, 'GROUND_GLB_INDEX_OUT_OF_RANGE')
        if (value < smallest) smallest = value
        if (value > largest) largest = value
      }
      if (accessor.min !== undefined || accessor.max !== undefined) {
        assert.deepEqual(accessor.min, [smallest], 'GROUND_GLB_INDEX_EXTREMA_MISMATCH')
        assert.deepEqual(accessor.max, [largest], 'GROUND_GLB_INDEX_EXTREMA_MISMATCH')
      }
      primitives++
      indices += accessor.count
    }
  }
  assert.ok(indices > 0, 'GROUND_GLB_INDEX_PAYLOAD_EMPTY')
  return {primitives, indices, releaseAuthorized: false, renderedProof: false}
}

test('real committed Ground GLB bytes, receipt, destinations and geometry agree; no launch authority', () => {
  const bytes = readFileSync(modelUrl)
  const document = parseGroundGlbBinary(bytes)
  const manifest = JSON.parse(readFileSync(receiptUrl, 'utf8'))
  const receipts = manifest.assets?.filter(x => x.fileName === 'ground-world-terrain-v1.glb') ?? []
  assert.equal(receipts.length, 1, 'GROUND_GLB_RECEIPT_MISSING_OR_DUPLICATE')
  assert.equal(bytes.length, receipts[0].bytes, 'GROUND_GLB_RECEIPT_SIZE_MISMATCH')
  assert.equal(createHash('sha256').update(bytes).digest('hex'), receipts[0].sha256,
    'GROUND_GLB_RECEIPT_HASH_MISMATCH')
  const geometry = inspectGroundIndexPayload(document, bytes)
  assert.ok(geometry.primitives > 0 && geometry.indices > 0)
  assert.equal(geometry.releaseAuthorized, false)
  const verdict = inspectGroundGlbAnchors(document, readFileSync(sourceUrl, 'utf8'))
  assert.deepEqual(verdict.failures, [], 'GROUND_GLB_SOURCE_STRUCTURE_MISMATCH')
  assert.equal(verdict.ok, true)
  assert.equal(verdict.anchorMatches, 12)
  assert.equal(verdict.renderedProof, false)
  assert.equal(verdict.artApproved, false)
  assert.equal(verdict.releaseAuthorized, false)
})

test('malformed binary header and absent BIN payload fail closed', () => {
  const sample = Buffer.alloc(28)
  assert.throws(() => parseGroundGlbBinary(sample), /GROUND_GLB_BAD_MAGIC/)
  sample.writeUInt32LE(0x46546c67, 0)
  sample.writeUInt32LE(2, 4)
  sample.writeUInt32LE(sample.length, 8)
  assert.throws(() => parseGroundGlbBinary(sample), /GROUND_GLB_JSON_BOUNDS_INVALID/)
})

test('actual index payload rejects a corrupt triangle index even when metadata is unchanged',()=>{
  const bytes = Buffer.from(readFileSync(modelUrl))
  const doc = parseGroundGlbBinary(bytes)
  const p = doc.meshes[0].primitives[0], a = doc.accessors[p.indices]
  const view = doc.bufferViews[a.bufferView]
  const at = 20 + bytes.readUInt32LE(12) + 8 + (view.byteOffset ?? 0) + (a.byteOffset ?? 0)
  const count = doc.accessors[p.attributes.POSITION].count
  if (a.componentType === 5125) bytes.writeUInt32LE(count, at)
  else if (a.componentType === 5123) bytes.writeUInt16LE(count, at)
  else bytes.writeUInt8(count, at)
  assert.throws(()=>inspectGroundIndexPayload(doc, bytes), /GROUND_GLB_INDEX_OUT_OF_RANGE/)
})

test('actual index payload rejects lying glTF extrema',()=>{
  const bytes = readFileSync(modelUrl)
  const doc = parseGroundGlbBinary(bytes)
  doc.accessors[doc.meshes[0].primitives[0].indices].max = [999999]
  assert.throws(()=>inspectGroundIndexPayload(doc, bytes), /GROUND_GLB_INDEX_EXTREMA_MISMATCH/)
})

test('index byte view outside embedded BIN payload fails closed',()=>{
  const bytes = readFileSync(modelUrl)
  const doc = parseGroundGlbBinary(bytes)
  const a = doc.accessors[doc.meshes[0].primitives[0].indices]
  doc.bufferViews[a.bufferView].byteOffset = bytes.length
  assert.throws(()=>inspectGroundIndexPayload(doc, bytes), /GROUND_GLB_INDEX_VIEW_BOUNDS_INVALID/)
})
