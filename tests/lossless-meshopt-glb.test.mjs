import assert from 'node:assert/strict';
import test from 'node:test';
import { GLTFLoader } from 'three-stdlib';
import { EXTENSION, prepareLosslessDerivative, readGlb, verifyLosslessDerivative, writeGlb } from '../scripts/lib/lossless-meshopt-glb.mjs';
import { MeshoptDecoder } from 'three-stdlib';

function fixture({ wideIndices = false, image = false, animation = false } = {}) {
  const arrays = [new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), wideIndices ? new Uint32Array([2, 0, 1, 1, 0, 2]) : new Uint16Array([2, 0, 1, 1, 0, 2])];
  const json = {
    asset: { version: '2.0', generator: 'Original author', extras: { provenance: 'retained', pendingReview: true } },
    buffers: [{ byteLength: 0, name: 'Authored buffer' }], bufferViews: [],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }, { bufferView: 1, componentType: wideIndices ? 5125 : 5123, count: 6, type: 'SCALAR' }],
    meshes: [{ name: 'Original mesh', primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    nodes: [{ mesh: 0, name: 'Original node', rotation: [0, -0, 0, 1] }], scenes: [{ nodes: [0] }], scene: 0,
    extras: { releaseState: 'pending-final-review', license: 'Original rights', acceptance: false },
  };
  if (animation) {
    arrays.push(new Float32Array([0, 1]), new Float32Array([0, 0, 0, 1, 2, 3]));
    json.accessors.push({ bufferView: 2, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] }, { bufferView: 3, componentType: 5126, count: 2, type: 'VEC3' });
    json.animations = [{ name: 'Authored motion', channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }], samplers: [{ input: 2, output: 3, interpolation: 'LINEAR' }] }];
  }
  if (image) {
    // Real 1x1 PNG; its compressed texture payload must not be recompressed.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
    json.images = [{ name: 'Authored texture', bufferView: arrays.length, mimeType: 'image/png' }];
    arrays.push(png);
  }
  const chunks = [];
  let offset = 0;
  for (const [index, array] of arrays.entries()) {
    const aligned = (offset + 3) & ~3;
    chunks.push(Buffer.alloc(aligned - offset));
    offset = aligned;
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(index === 0 ? { target: 34962 } : index === 1 ? { target: 34963 } : {}) });
    chunks.push(bytes);
    offset += bytes.length;
  }
  const bin = Buffer.concat(chunks);
  json.buffers[0].byteLength = bin.length;
  return writeGlb(json, bin);
}

for (const wideIndices of [false, true]) test(`Runtime decoder preserves ${wideIndices ? 'Uint32' : 'Uint16'} index order, floats, animation and PNG bytes`, async () => {
  const original = fixture({ wideIndices, image: true, animation: true });
  const { candidate, proof } = await prepareLosslessDerivative(original);
  assert.equal(proof.compressedViews, 4);
  assert.equal(proof.images.length, 1);
  assert.equal(proof.views[1].mode, 'INDICES');
  assert.ok(proof.views.every((view) => view.decodedBytesEqual));
  assert.ok(proof.images.every((image) => image.encodedBytesEqual));
  assert.equal(proof.semanticMetadataEqual, true);
  assert.deepEqual(readGlb(candidate).json.asset, readGlb(original).json.asset);
  assert.ok(Object.is(readGlb(candidate).json.nodes[0].rotation[1], -0), 'Authored negative zero must survive serialization');
  const repeated = await prepareLosslessDerivative(original);
  assert.deepEqual(repeated.candidate, candidate, 'Preparation must be byte deterministic');
});

test('Actual Drei GLTFLoader loads compressed mesh and animation equal to source', async () => {
  const original = fixture({ animation: true });
  const { candidate } = await prepareLosslessDerivative(original);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder());
  const parse = (bytes) => loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const before = await parse(original);
  const after = await parse(candidate);
  const geometry = (gltf) => {
    const mesh = gltf.scene.getObjectByName('Original_node');
    return { positions: [...mesh.geometry.attributes.position.array], indices: [...mesh.geometry.index.array] };
  };
  assert.deepEqual(geometry(after), geometry(before));
  const clips = (gltf) => gltf.animations.map((clip) => {
    const json = clip.toJSON();
    delete json.uuid; // Loader allocates new instance IDs for each parse.
    return json;
  });
  assert.deepEqual(clips(after), clips(before));
});

test('Preserves unusual IEEE float bit patterns exactly without quantization', async () => {
  const source = readGlb(fixture());
  for (const [index, bits] of [0x80000000, 0x7fc12345, 0x00000001, 0x7f800000].entries()) source.bin.writeUInt32LE(bits, index * 4);
  const original = writeGlb(source.json, source.bin);
  const { candidate } = await prepareLosslessDerivative(original);
  await verifyLosslessDerivative(original, candidate);
});

test('Rejects corrupt compressed payload and semantic metadata edits', async () => {
  const original = fixture();
  const { candidate } = await prepareLosslessDerivative(original);
  const corrupt = readGlb(candidate);
  corrupt.bin[0] = 0;
  await assert.rejects(verifyLosslessDerivative(original, writeGlb(corrupt.json, corrupt.bin)));
  const semantic = readGlb(candidate);
  semantic.json.asset.extras.pendingReview = false;
  await assert.rejects(verifyLosslessDerivative(original, writeGlb(semantic.json, semantic.bin)), /Semantic glTF metadata changed/);
});

test('Rejects truncation, external buffers, sparse and shared accessor layouts', async () => {
  const original = fixture();
  assert.throws(() => readGlb(original.subarray(0, original.length - 1)), /Invalid GLB/);
  for (const mutate of [
    (json) => { json.buffers[0].uri = 'external.bin'; },
    (json) => { json.accessors[0].sparse = { count: 1 }; },
    (json) => { json.accessors.push({ ...json.accessors[0] }); },
    (json) => { json.bufferViews[0].byteStride = 16; },
  ]) {
    const { json, bin } = readGlb(original);
    mutate(json);
    await assert.rejects(prepareLosslessDerivative(writeGlb(json, bin)));
  }
});

test('Placeholder fallback is required and keeps original metadata/byte length', async () => {
  const original = fixture({ image: true });
  const { candidate } = await prepareLosslessDerivative(original);
  const before = readGlb(original);
  const after = readGlb(candidate);
  assert.deepEqual(after.json.extensionsRequired, [EXTENSION]);
  assert.deepEqual(after.json.buffers[1], { byteLength: before.bin.length, extensions: { [EXTENSION]: { fallback: true } } });
  assert.equal(after.json.buffers[1].uri, undefined);
  assert.equal(after.json.buffers[0].name, 'Authored buffer');
  assert.equal(after.json.bufferViews[after.json.images[0].bufferView].buffer, 0);
});
