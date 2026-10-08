import fs from 'node:fs'
import crypto from 'node:crypto'
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.mjs'
import { MeshoptEncoder } from '../vendor/meshopt_encoder.module.mjs'

export const HOME_NORMAL_PREDECESSOR = Object.freeze({
  bytes: 184160,
  sha256: 'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529',
  sourceSha: '51db7b3ba77a657659da34ca5e146e049dd03d31',
  gitBlob: 'dd757954937009d2ee54a52df6f56792528356f4',
  archivePath: 'operations/assets/normal-repair-predecessors/home-entry-chamber-v1.b7bdced5a721598a.glb',
})
export const HOME_NORMAL_CODEC = Object.freeze({
  decoderSha256: '97901fb3d2d296eeea2a57348a734ef0a17e35f2d4aea5a65223635d3f0e1709',
  encoderSha256: 'e79ba4a73a758f315ab153dc50c389c7b0bea2b5c1fdcfcaa62ad6d0c27cb25c',
  version: 'meshoptimizer 1.0; ATTRIBUTES level2 version0 filterNONE',
})
const EXPECTED_ZERO_ACCESSORS = [119, 121, 185, 195, 197, 199, 201]
const MAX_DECODED_BYTES = 16 * 1024 * 1024
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const fail = (reason) => { throw new Error(`Home normal repair: ${reason}`) }
const same = (left, right, reason) => { if (JSON.stringify(left) !== JSON.stringify(right)) fail(reason) }
const integer = (value, reason, minimum = 0) => { if (!Number.isSafeInteger(value) || value < minimum) fail(reason); return value }

function codecIntegrity() {
  for (const [name, digest] of [['decoder', HOME_NORMAL_CODEC.decoderSha256], ['encoder', HOME_NORMAL_CODEC.encoderSha256]]) {
    if (sha(fs.readFileSync(new URL(`../vendor/meshopt_${name}.module.mjs`, import.meta.url))) !== digest) fail(`pinned ${name} integrity mismatch`)
  }
}

function parse(bytes) {
  if (bytes.length < 28 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) fail('invalid GLB header')
  const jsonLength = bytes.readUInt32LE(12), binHeader = 20 + jsonLength
  if (jsonLength % 4 || bytes.readUInt32LE(16) !== 0x4e4f534a || binHeader + 8 > bytes.length || bytes.readUInt32LE(binHeader + 4) !== 0x004e4942) fail('invalid JSON/BIN chunk layout')
  const binLength = bytes.readUInt32LE(binHeader)
  if (binLength % 4 || binHeader + 8 + binLength !== bytes.length) fail('invalid BIN chunk extent')
  const json = JSON.parse(bytes.subarray(20, binHeader).toString('utf8'))
  if (json.asset?.version !== '2.0' || json.buffers?.[0]?.uri || !Number.isSafeInteger(json.buffers?.[0]?.byteLength) || json.buffers[0].byteLength > binLength || binLength - json.buffers[0].byteLength > 3) fail('invalid embedded buffer extent')
  return { json, bin: bytes.subarray(binHeader + 8, binHeader + 8 + json.buffers[0].byteLength) }
}

async function decode(bytes) {
  const { json, bin } = parse(bytes), views = [], accessors = []
  await MeshoptDecoder.ready
  let decodedBytes = 0
  if (!json.extensionsRequired?.includes('EXT_meshopt_compression') || !json.extensionsRequired?.includes('KHR_mesh_quantization')) fail('required compression/quantization authority missing')
  for (const [index, view] of json.bufferViews.entries()) {
    const extension = view.extensions?.EXT_meshopt_compression
    if (!extension || extension.buffer !== 0) fail(`view ${index} is not embedded meshopt data`)
    const size = integer(view.byteLength, `view ${index} length invalid`, 1), count = integer(extension.count, `view ${index} count invalid`, 1), stride = integer(extension.byteStride, `view ${index} stride invalid`, 1)
    const offset = integer(extension.byteOffset ?? 0, `view ${index} compressed offset invalid`), length = integer(extension.byteLength, `view ${index} compressed length invalid`, 1), logicalOffset = integer(view.byteOffset ?? 0, `view ${index} logical offset invalid`)
    const filter = extension.filter ?? 'NONE'
    if (offset + length > bin.length || size !== count * stride || decodedBytes + size > MAX_DECODED_BYTES || !['ATTRIBUTES', 'TRIANGLES', 'INDICES'].includes(extension.mode)) fail(`view ${index} bounds/mode invalid`)
    if (!['NONE', 'OCTAHEDRAL', 'QUATERNION', 'EXPONENTIAL'].includes(filter) || (extension.mode !== 'ATTRIBUTES' && filter !== 'NONE')) fail(`view ${index} filter invalid`)
    if (extension.mode === 'ATTRIBUTES' && (stride % 4 || stride > 256 || (view.byteStride != null && view.byteStride !== stride))) fail(`view ${index} attribute stride invalid`)
    if (extension.mode !== 'ATTRIBUTES' && ![2, 4].includes(stride)) fail(`view ${index} index stride invalid`)
    if (extension.mode === 'TRIANGLES' && count % 3) fail(`view ${index} triangle count invalid`)
    if ((filter === 'OCTAHEDRAL' && ![4, 8].includes(stride)) || (filter === 'QUATERNION' && stride !== 8)) fail(`view ${index} filtered stride invalid`)
    const logicalBuffer = json.buffers?.[view.buffer]
    if (!logicalBuffer || logicalOffset + size > logicalBuffer.byteLength || logicalOffset % 4) fail(`view ${index} logical buffer extent invalid`)
    const data = Buffer.alloc(size)
    MeshoptDecoder.decodeGltfBuffer(data, count, stride, bin.subarray(offset, offset + length), extension.mode, filter)
    views.push(data); decodedBytes += size
  }
  const componentSizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
  for (const [index, accessor] of json.accessors.entries()) {
    const size = componentSizes[accessor.componentType], width = widths[accessor.type], count = integer(accessor.count, `accessor ${index} count invalid`, 1), offset = integer(accessor.byteOffset ?? 0, `accessor ${index} offset invalid`)
    const view = json.bufferViews[accessor.bufferView], data = views[accessor.bufferView], stride = view?.byteStride ?? size * width
    if (!size || !width || accessor.sparse || !data || offset % size || stride % size || stride < size * width || offset + (count - 1) * stride + size * width > data.length) fail(`accessor ${index} layout/bounds invalid`)
    const methods = { 5120: 'readInt8', 5121: 'readUInt8', 5122: 'readInt16LE', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }
    const values = Array.from({ length: count }, (_, vertex) => Array.from({ length: width }, (_, axis) => data[methods[accessor.componentType]](offset + vertex * stride + axis * size)))
    if (values.some((vector) => vector.some((value) => !Number.isFinite(value)))) fail(`accessor ${index} has non-finite values`)
    for (const bound of [accessor.min, accessor.max]) if (bound != null && (!Array.isArray(bound) || bound.length !== width || !bound.every(Number.isFinite))) fail(`accessor ${index} bounds metadata invalid`)
    if ((accessor.min == null) !== (accessor.max == null)) fail(`accessor ${index} incomplete bounds`)
    if (accessor.min && (accessor.min.some((value, axis) => value > accessor.max[axis]) || values.some((vector) => vector.some((value, axis) => value < accessor.min[axis] - 1e-5 || value > accessor.max[axis] + 1e-5)))) fail(`accessor ${index} exceeds declared bounds`)
    accessors.push(values)
  }
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    if ((primitive.mode ?? 4) !== 4) fail('non-triangle primitive unsupported')
    const positions = accessors[primitive.attributes?.POSITION], normals = accessors[primitive.attributes?.NORMAL]
    if (!positions || !normals || positions.length !== normals.length || primitive.targets) fail('invalid primitive attribute/morph layout')
    for (const accessor of Object.values(primitive.attributes)) if (!accessors[accessor] || accessors[accessor].length !== positions.length) fail('primitive attribute count mismatch')
    const indices = primitive.indices == null ? positions.map((_, i) => i) : accessors[primitive.indices]?.map(([value]) => value)
    if (!indices || indices.length % 3 || indices.some((value) => !Number.isSafeInteger(value) || value < 0 || value >= positions.length)) fail('primitive indices out of bounds')
  }
  return { json, bin, views, accessors, decodedBytes }
}

function expectedRepairs(decoded) {
  const normalAccessors = new Set(decoded.json.meshes.flatMap((mesh) => mesh.primitives.map((primitive) => primitive.attributes.NORMAL))), zeroAccessors = []
  for (const index of normalAccessors) {
    const zeros = decoded.accessors[index].flatMap((vector, vertex) => vector.every((value) => value === 0) ? [vertex] : [])
    if (zeros.length) { same(zeros, [3, 4], `unexpected zero scope in accessor ${index}`); zeroAccessors.push(index) }
  }
  same(zeroAccessors.sort((a, b) => a - b), EXPECTED_ZERO_ACCESSORS, 'unexpected zero accessor scope')
  const repairs = []
  for (const index of EXPECTED_ZERO_ACCESSORS) {
    const accessor = decoded.json.accessors[index], view = decoded.json.bufferViews[accessor.bufferView], extension = view.extensions.EXT_meshopt_compression
    if (accessor.componentType !== 5122 || accessor.normalized !== true || accessor.type !== 'VEC3' || accessor.byteOffset !== 0 || view.byteStride !== 8 || extension.mode !== 'ATTRIBUTES' || (extension.filter ?? 'NONE') !== 'NONE') fail(`accessor ${index} exact repair layout changed`)
    const users = decoded.json.meshes.flatMap((mesh, meshIndex) => mesh.primitives.flatMap((primitive) => primitive.attributes.NORMAL === index ? [{ meshIndex, primitive }] : []))
    if (!users.length) fail(`accessor ${index} is unmounted`)
    for (const [vertex, donorVertex, after] of [[3, 0, [0, 0, 32767]], [4, 5, [0, 0, -32767]]]) {
      same(decoded.accessors[index][donorVertex], after, `accessor ${index} donor normal changed`)
      let degenerateReferences = 0
      for (const { primitive } of users) {
        const positions = decoded.accessors[primitive.attributes.POSITION]
        same(positions[vertex], positions[donorVertex], `accessor ${index} same-position donor changed`)
        const indices = primitive.indices == null ? positions.map((_, i) => i) : decoded.accessors[primitive.indices].map(([value]) => value)
        for (let at = 0; at < indices.length; at += 3) {
          const triangle = indices.slice(at, at + 3)
          if (!triangle.includes(vertex)) continue
          const [a, b, c] = triangle.map((v) => positions[v]), u = b.map((v, axis) => v - a[axis]), v = c.map((value, axis) => value - a[axis])
          const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
          if (cross.some((value) => value !== 0)) fail(`accessor ${index}:${vertex} participates in a nondegenerate triangle`)
          degenerateReferences++
        }
      }
      if (!degenerateReferences) fail(`accessor ${index}:${vertex} has no triangle references`)
      repairs.push({ accessor: index, bufferView: accessor.bufferView, vertex, donorVertex, before: [0, 0, 0], after, degenerateReferences, adjacentNondegenerateTriangles: 0, samePositionExact: true })
    }
  }
  return repairs
}

function encode(json, bin) {
  const text = Buffer.from(JSON.stringify(json)), jsonChunk = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20), binChunk = Buffer.alloc(Math.ceil(bin.length / 4) * 4)
  text.copy(jsonChunk); bin.copy(binChunk)
  const output = Buffer.alloc(28 + jsonChunk.length + binChunk.length)
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(jsonChunk.length, 12); output.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(output, 20)
  const at = 20 + jsonChunk.length
  output.writeUInt32LE(binChunk.length, at); output.writeUInt32LE(0x004e4942, at + 4); binChunk.copy(output, at + 8)
  return output
}

function maskedJson(json, changedViews) {
  const result = structuredClone(json)
  result.buffers[0].byteLength = 'NORMAL_REPAIR_EMBEDDED_BUFFER_LENGTH'
  for (const index of changedViews) {
    result.bufferViews[index].extensions.EXT_meshopt_compression.byteOffset = 'NORMAL_REPAIR_STREAM_OFFSET'
    result.bufferViews[index].extensions.EXT_meshopt_compression.byteLength = 'NORMAL_REPAIR_STREAM_LENGTH'
  }
  return result
}

export async function verifyHomeNormalRepair(predecessor, candidate) {
  codecIntegrity()
  if (predecessor.length !== HOME_NORMAL_PREDECESSOR.bytes || sha(predecessor) !== HOME_NORMAL_PREDECESSOR.sha256) fail('exact predecessor identity mismatch')
  const before = await decode(predecessor), after = await decode(candidate), repairs = expectedRepairs(before), changedViews = [...new Set(repairs.map((repair) => repair.bufferView))]
  same(maskedJson(before.json, changedViews), maskedJson(after.json, changedViews), 'JSON changed outside compressed normal offsets/lengths and embedded buffer length')
  if (!after.bin.subarray(0, before.bin.length).equals(before.bin)) fail('original embedded BIN prefix changed')
  const changes = []
  for (let view = 0; view < before.views.length; view++) {
    const expected = Buffer.from(before.views[view])
    for (const repair of repairs.filter((entry) => entry.bufferView === view)) {
      const stride = before.json.bufferViews[view].byteStride
      repair.after.forEach((value, axis) => expected.writeInt16LE(value, repair.vertex * stride + axis * 2))
    }
    if (!after.views[view]?.equals(expected)) fail(`decoded view ${view} changed outside exact normal repairs`)
    const differences = []
    for (let offset = 0; offset < expected.length; offset++) if (before.views[view][offset] !== after.views[view][offset]) differences.push(offset)
    if (differences.length) changes.push({ bufferView: view, byteOffsets: differences, beforeSha256: sha(before.views[view]), afterSha256: sha(after.views[view]) })
  }
  for (let index = 0; index < before.accessors.length; index++) {
    const expected = structuredClone(before.accessors[index])
    for (const repair of repairs.filter((entry) => entry.accessor === index)) expected[repair.vertex] = repair.after
    same(expected, after.accessors[index], `decoded accessor ${index} changed outside exact normal repairs`)
  }
  return { schema: 'urai.home-normal-repair-proof.v1', predecessor: HOME_NORMAL_PREDECESSOR, candidate: { bytes: candidate.length, sha256: sha(candidate) }, codec: HOME_NORMAL_CODEC, method: 'Exact same-position valid donor normals for14zero vectors used only by degenerate triangles; append reencoded NORMAL streams and preserve original BIN prefix', repairs, decodedByteChanges: changes, changedNormalVectors: repairs.length, changedNormalBufferViews: changedViews.length, allBufferViewsDecoded: before.views.length, allAccessorsVerified: before.accessors.length, decodedBytes: before.decodedBytes, originalBinPrefixBytesPreserved: before.bin.length, geometryTopologyMaterialsNodesSkinsAnimationsUntouched: true, jsonChangesLimitedToCompressionOffsetsLengthsAndEmbeddedBufferLength: true, visualAcceptance: false, humanReviewApproved: false, deviceAcceptance: false, productionPromotion: false, exactHeadChecksPassed: false }
}

export async function deriveHomeNormalRepair(predecessor) {
  codecIntegrity()
  if (predecessor.length !== HOME_NORMAL_PREDECESSOR.bytes || sha(predecessor) !== HOME_NORMAL_PREDECESSOR.sha256) fail('exact predecessor identity mismatch')
  const decoded = await decode(predecessor), repairs = expectedRepairs(decoded), json = structuredClone(decoded.json), streams = [decoded.bin]
  let length = decoded.bin.length
  await MeshoptEncoder.ready
  for (const viewIndex of [...new Set(repairs.map((repair) => repair.bufferView))]) {
    const data = Buffer.from(decoded.views[viewIndex]), extension = json.bufferViews[viewIndex].extensions.EXT_meshopt_compression
    for (const repair of repairs.filter((entry) => entry.bufferView === viewIndex)) repair.after.forEach((value, axis) => data.writeInt16LE(value, repair.vertex * extension.byteStride + axis * 2))
    const compressed = Buffer.from(MeshoptEncoder.encodeGltfBuffer(data, extension.count, extension.byteStride, 'ATTRIBUTES', 0))
    const padding = (4 - length % 4) % 4
    if (padding) { streams.push(Buffer.alloc(padding)); length += padding }
    extension.byteOffset = length; extension.byteLength = compressed.length
    streams.push(compressed); length += compressed.length
  }
  json.buffers[0].byteLength = length
  const candidate = encode(json, Buffer.concat(streams))
  return { candidate, proof: await verifyHomeNormalRepair(predecessor, candidate) }
}
