import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'three-stdlib';

export const EXTENSION = 'EXT_meshopt_compression';
const decoder = MeshoptDecoder(); // Same factory imported by Drei's useGLTF.
const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const align4 = (value) => (value + 3) & ~3;
const fail = (message) => { throw new Error(message); };
const integer = (value, name, minimum = 0) => {
  if (!Number.isSafeInteger(value) || value < minimum) fail(`Invalid ${name}`);
  return value;
};
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// JSON.stringify changes -0 to 0; authored transforms can contain either.
// A derivative must retain parsed numerical values, including the sign of zero.
function losslessJsonStringify(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Non-finite JSON number');
    return Object.is(value, -0) ? '-0' : JSON.stringify(value);
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(losslessJsonStringify).join(',')}]`;
  if (typeof value === 'object') return `{${Object.entries(value).map(([key, entry]) => `${JSON.stringify(key)}:${losslessJsonStringify(entry)}`).join(',')}}`;
  fail('Unsupported JSON value');
}

export function readGlb(input) {
  const bytes = Buffer.from(input);
  if (bytes.length < 28 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) fail('Invalid GLB header or length');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) fail('Truncated GLB chunk header');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    if (length % 4 || offset + 8 + length > bytes.length) fail('Invalid GLB chunk bounds or alignment');
    chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  if (chunks.length !== 2 || chunks[0].type !== 0x4e4f534a || chunks[1].type !== 0x004e4942) fail('Expected exactly JSON and BIN chunks');
  const json = JSON.parse(chunks[0].bytes.toString('utf8'));
  if (json.asset?.version !== '2.0' || !Array.isArray(json.buffers) || !json.buffers.length) fail('Invalid glTF asset or buffers');
  const length = integer(json.buffers[0].byteLength, 'buffer byteLength');
  if (length > chunks[1].bytes.length || chunks[1].bytes.length - length > 3 || chunks[1].bytes.subarray(length).some((value) => value !== 0)) fail('Invalid BIN length or padding');
  return { json, bin: chunks[1].bytes.subarray(0, length) };
}

export function writeGlb(json, input) {
  const bin = Buffer.from(input);
  if (json.buffers?.[0]?.byteLength !== bin.length) fail('Declared binary buffer length mismatch');
  const text = Buffer.from(losslessJsonStringify(json));
  const jsonLength = align4(text.length);
  const binLength = align4(bin.length);
  const bytes = Buffer.alloc(12 + 8 + jsonLength + 8 + binLength);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(jsonLength, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  bytes.fill(0x20, 20, 20 + jsonLength);
  text.copy(bytes, 20);
  const header = 20 + jsonLength;
  bytes.writeUInt32LE(binLength, header);
  bytes.writeUInt32LE(0x004e4942, header + 4);
  bin.copy(bytes, header + 8);
  return bytes;
}

function viewBytes(glb, view) {
  if (view.buffer !== 0) fail('Expected a view in embedded buffer 0');
  const offset = integer(view.byteOffset ?? 0, 'view byteOffset');
  const length = integer(view.byteLength, 'view byteLength', 1);
  if (offset + length > glb.bin.length) fail('Buffer view outside binary buffer');
  return glb.bin.subarray(offset, offset + length);
}

function sourceLayouts(glb) {
  const { json } = glb;
  if (json.buffers.length !== 1 || json.buffers[0].uri !== undefined || json.extensionsUsed?.includes(EXTENSION) || json.extensionsRequired?.includes(EXTENSION)) fail('Expected uncompressed single embedded buffer');
  if (!Array.isArray(json.bufferViews) || !Array.isArray(json.accessors)) fail('Missing views/accessors');
  const accessorsByView = new Map();
  for (const [index, accessor] of json.accessors.entries()) {
    if (accessor.sparse || accessor.bufferView === undefined) fail('Sparse or bufferless accessors are not supported');
    integer(accessor.bufferView, 'accessor bufferView');
    if (!json.bufferViews[accessor.bufferView] || accessorsByView.has(accessor.bufferView)) fail('Missing or shared accessor buffer view');
    if ((accessor.byteOffset ?? 0) !== 0) fail('Accessor offsets are not supported');
    accessorsByView.set(accessor.bufferView, { accessor, index });
  }
  const indexAccessors = new Set((json.meshes ?? []).flatMap((mesh) => (mesh.primitives ?? []).map((primitive) => primitive.indices).filter((index) => index !== undefined)));
  const imageViews = new Set();
  for (const image of json.images ?? []) {
    if (image.uri !== undefined || image.bufferView === undefined || !json.bufferViews[image.bufferView]) fail('Expected embedded images');
    imageViews.add(image.bufferView);
  }
  return json.bufferViews.map((view, index) => {
    viewBytes(glb, view);
    if (view.extensions?.[EXTENSION]) fail('Source already has a compressed view');
    const entry = accessorsByView.get(index);
    if (!entry) {
      if (!imageViews.has(index)) fail('Unclassified buffer view cannot be rewritten safely');
      return null;
    }
    if (imageViews.has(index)) fail('Image/accessor shared buffer views are not supported');
    const { accessor, index: accessorIndex } = entry;
    const size = componentBytes[accessor.componentType] * components[accessor.type];
    if (!size || (accessor.type.startsWith('MAT') && accessor.componentType !== 5126)) fail('Unsupported accessor component layout');
    const stride = view.byteStride ?? size;
    if (stride !== size) fail('Interleaved or padded accessor views are not supported');
    const count = integer(accessor.count, 'accessor count', 1);
    if (view.byteLength !== stride * count) fail('Accessor view length mismatch');
    const mode = indexAccessors.has(accessorIndex) ? 'INDICES' : 'ATTRIBUTES';
    if (mode === 'INDICES') {
      if (accessor.type !== 'SCALAR' || ![5123, 5125].includes(accessor.componentType) || view.byteStride !== undefined) fail('Unsupported index accessor layout');
    } else if (stride % 4 || stride > 256) fail('Unsupported attribute stride');
    return { mode, count, stride };
  });
}

async function decodeView(glb, view) {
  const extension = view.extensions?.[EXTENSION];
  if (!extension) return Buffer.from(viewBytes(glb, view));
  if (extension.buffer !== 0 || view.buffer !== 1 || extension.filter !== 'NONE') fail('Unexpected compressed buffer/filter');
  const offset = integer(extension.byteOffset ?? 0, 'compressed byteOffset');
  const length = integer(extension.byteLength, 'compressed byteLength', 1);
  const count = integer(extension.count, 'compressed count', 1);
  const stride = integer(extension.byteStride, 'compressed stride', 1);
  if (offset + length > glb.bin.length || view.byteLength !== count * stride) fail('Invalid compressed range or decoded layout');
  if ((view.byteOffset ?? 0) + view.byteLength > glb.json.buffers[1].byteLength) fail('View outside placeholder fallback buffer');
  if (view.byteStride !== undefined && view.byteStride !== stride) fail('Parent/extension stride mismatch');
  if (extension.mode === 'ATTRIBUTES' ? stride % 4 || stride > 256 : extension.mode !== 'INDICES' || ![2, 4].includes(stride)) fail('Invalid compression mode/stride');
  await decoder.ready;
  const output = new Uint8Array(view.byteLength);
  decoder.decodeGltfBuffer(output, count, stride, glb.bin.subarray(offset, offset + length), extension.mode, 'NONE');
  return Buffer.from(output);
}

function semanticJson(json) {
  const result = structuredClone(json);
  for (const key of ['buffers', 'bufferViews', 'extensionsUsed', 'extensionsRequired']) delete result[key];
  return result;
}

function viewMetadata(view) {
  const result = structuredClone(view);
  delete result.buffer;
  delete result.byteOffset;
  if (result.extensions) {
    delete result.extensions[EXTENSION];
    if (!Object.keys(result.extensions).length) delete result.extensions;
  }
  return result;
}

export async function verifyLosslessDerivative(originalBytes, candidateBytes) {
  const original = readGlb(originalBytes);
  const candidate = readGlb(candidateBytes);
  const layouts = sourceLayouts(original);
  assert.deepEqual(semanticJson(candidate.json), semanticJson(original.json), 'Semantic glTF metadata changed');
  for (const key of ['extensionsUsed', 'extensionsRequired']) assert.deepEqual(candidate.json[key], [...(original.json[key] ?? []), EXTENSION], `${key} changed unexpectedly`);
  assert.equal(candidate.json.buffers.length, 2, 'Expected one binary and one placeholder buffer');
  assert.deepEqual(candidate.json.buffers[0], { ...original.json.buffers[0], byteLength: candidate.bin.length });
  assert.deepEqual(candidate.json.buffers[1], { byteLength: original.bin.length, extensions: { [EXTENSION]: { fallback: true } } });
  assert.equal(candidate.json.bufferViews.length, original.json.bufferViews.length);
  const views = [];
  for (const [index, originalView] of original.json.bufferViews.entries()) {
    const candidateView = candidate.json.bufferViews[index];
    assert.deepEqual(viewMetadata(candidateView), viewMetadata(originalView), `View ${index} metadata changed`);
    const extension = candidateView.extensions?.[EXTENSION];
    if (layouts[index]) {
      const { count, stride, mode } = layouts[index];
      assert.ok(extension, `Accessor view ${index} was not compressed`);
      assert.deepEqual(extension, { buffer: 0, byteOffset: extension.byteOffset, byteLength: extension.byteLength, byteStride: stride, count, mode, filter: 'NONE' });
      assert.equal(candidateView.byteOffset ?? 0, originalView.byteOffset ?? 0);
    } else assert.equal(extension, undefined, 'Embedded image unexpectedly compressed');
    const source = viewBytes(original, originalView);
    const decoded = await decodeView(candidate, candidateView);
    assert.deepEqual(decoded, source, `Decoded view ${index} differs from source bytes`);
    views.push({ index, byteLength: source.length, sha256: sha256(source), compressed: Boolean(extension), mode: extension?.mode ?? 'UNCHANGED_IMAGE', decodedBytesEqual: true });
  }
  const images = (original.json.images ?? []).map((image, index) => ({ index, bufferView: image.bufferView, mimeType: image.mimeType, sha256: views[image.bufferView].sha256, encodedBytesEqual: true }));
  return { decoder: 'three-stdlib MeshoptDecoder factory (Drei useGLTF default)', filter: 'NONE', encodedVersion: 0, semanticMetadataEqual: true, semanticMetadataSha256: sha256(losslessJsonStringify(semanticJson(original.json))), compressedViews: views.filter((view) => view.compressed).length, unchangedImageViews: views.filter((view) => !view.compressed).length, views, images };
}

export async function prepareLosslessDerivative(originalBytes) {
  const original = readGlb(originalBytes);
  const layouts = sourceLayouts(original);
  if (!layouts.some(Boolean)) fail('No compressible accessor views');
  await MeshoptEncoder.ready;
  if (!MeshoptEncoder.supported) fail('Installed Meshopt encoder is unavailable');
  const json = structuredClone(original.json);
  const chunks = [];
  let offset = 0;
  for (const [index, view] of original.json.bufferViews.entries()) {
    const layout = layouts[index];
    const source = viewBytes(original, view);
    const payload = layout ? Buffer.from(MeshoptEncoder.encodeGltfBuffer(source, layout.count, layout.stride, layout.mode, 0)) : Buffer.from(source);
    const aligned = align4(offset);
    if (aligned !== offset) chunks.push(Buffer.alloc(aligned - offset));
    offset = aligned;
    if (layout) {
      json.bufferViews[index].buffer = 1;
      json.bufferViews[index].extensions = { ...view.extensions, [EXTENSION]: { buffer: 0, byteOffset: offset, byteLength: payload.length, byteStride: layout.stride, count: layout.count, mode: layout.mode, filter: 'NONE' } };
    } else {
      json.bufferViews[index].buffer = 0;
      json.bufferViews[index].byteOffset = offset;
    }
    chunks.push(payload);
    offset += payload.length;
  }
  const bin = Buffer.concat(chunks);
  json.buffers = [{ ...original.json.buffers[0], byteLength: bin.length }, { byteLength: original.bin.length, extensions: { [EXTENSION]: { fallback: true } } }];
  for (const key of ['extensionsUsed', 'extensionsRequired']) json[key] = [...(original.json[key] ?? []), EXTENSION];
  const candidate = writeGlb(json, bin);
  const proof = await verifyLosslessDerivative(originalBytes, candidate);
  return { candidate, proof };
}
