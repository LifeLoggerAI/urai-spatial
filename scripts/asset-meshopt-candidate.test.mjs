import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { deriveAssetMeshoptCandidate, verifyAssetMeshoptCandidate, assetSha256 } from './lib/asset-meshopt-candidate.mjs'

const root = path.resolve(import.meta.dirname, '..')
const original = fs.readFileSync(path.join(root, 'urai-tier1/public/assets/urai/generated/models/life-map-memory-star-v1.glb'))
function rewriteJson(bytes, change) {
  const length = bytes.readUInt32LE(12), bin = bytes.subarray(20 + length)
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'))
  change(json)
  const text = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20)
  text.copy(padded)
  const output = Buffer.concat([bytes.subarray(0, 20), padded, bin])
  output.writeUInt32LE(output.length, 8); output.writeUInt32LE(padded.length, 12)
  return output
}

test('registered model compresses losslessly with immutable source and admission false', async () => {
  const sourceHash = assetSha256(original)
  const { candidate, proof } = await deriveAssetMeshoptCandidate(original)
  assert.ok(candidate.length < original.length)
  assert.equal(assetSha256(original), sourceHash)
  assert.ok(proof.allDecodedViewsIdentical && proof.embeddedImageBytesIdentical && proof.sceneMaterialsSkinsAnimationsIdentical)
  assert.ok(proof.compressedViews > 0)
  assert.ok(Object.values(proof.admission).every(value => value === false))
  assert.deepEqual(await verifyAssetMeshoptCandidate(original, candidate), proof)
})

test('authored signed zero rotations survive candidate serialization exactly', async () => {
  const ground = fs.readFileSync(path.join(root, 'urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb'))
  const { candidate } = await deriveAssetMeshoptCandidate(ground)
  const read = bytes => JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
  assert.ok(read(ground).nodes.some(node => node.rotation?.some(value => Object.is(value, -0))))
  assert.deepEqual(read(candidate).nodes, read(ground).nodes)
})

test('installed consumer loader preserves geometry, skin names and animation tracks', async () => {
  const tierOneRequire = createRequire(path.join(root, 'urai-tier1/package.json'))
  const stdlib = path.dirname(tierOneRequire.resolve('three-stdlib'))
  const { GLTFLoader } = await import(pathToFileURL(path.join(stdlib, 'loaders/GLTFLoader.js')).href)
  const { MeshoptDecoder } = await import(pathToFileURL(path.join(stdlib, 'libs/MeshoptDecoder.js')).href)
  const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder
  await decoder.ready
  globalThis.self = globalThis
  const { candidate } = await deriveAssetMeshoptCandidate(original)
  const parse = bytes => {
    const loader = new GLTFLoader().setMeshoptDecoder(decoder)
    // Image bytes are independently verified above; this CPU test exercises
    // the actual geometry/animation decoder without a browser or GPU.
    loader.register(() => ({ name: 'CPU_TEXTURE_SKIP', loadTexture: () => Promise.resolve(null) }))
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  }
  const describe = model => {
    const meshes = []
    model.scene.traverse(node => {
      if (!node.isMesh) return
      meshes.push({ name: node.name, indices: node.geometry.index ? Array.from(node.geometry.index.array) : null,
        attributes: Object.fromEntries(Object.entries(node.geometry.attributes).map(([name, item]) => [name, { itemSize: item.itemSize, normalized: item.normalized, array: Array.from(item.array) }])),
        skin: node.skeleton?.bones.map(bone => bone.name) ?? null })
    })
    return { meshes, animations: model.animations.map(clip => ({ name: clip.name, duration: clip.duration,
      tracks: clip.tracks.map(track => ({ name: track.name, times: Array.from(track.times), values: Array.from(track.values) })) })) }
  }
  assert.deepEqual(describe(await parse(candidate)), describe(await parse(original)))
})

test('verification rejects scene metadata changes and compressed byte corruption', async () => {
  const { candidate } = await deriveAssetMeshoptCandidate(original)
  await assert.rejects(verifyAssetMeshoptCandidate(original, rewriteJson(candidate, json => { json.nodes[0].name = 'tampered' })), /changed scene/)
  const jsonLength = candidate.readUInt32LE(12), json = JSON.parse(candidate.subarray(20, 20 + jsonLength).toString('utf8'))
  const view = json.bufferViews.find(view => view.extensions?.EXT_meshopt_compression)
  const corrupt = Buffer.from(candidate)
  corrupt[28 + jsonLength + view.extensions.EXT_meshopt_compression.byteOffset] ^= 0xff
  await assert.rejects(verifyAssetMeshoptCandidate(original, corrupt))
})

test('unsupported sparse, shared, offset and interleaved accessors fail closed', async () => {
  for (const change of [
    json => { json.accessors[0].sparse = {} },
    json => { json.accessors[1].bufferView = json.accessors[0].bufferView },
    json => { json.accessors[0].byteOffset = 4 },
    json => { json.bufferViews[json.accessors[0].bufferView].byteStride = 128 },
  ]) await assert.rejects(deriveAssetMeshoptCandidate(rewriteJson(original, change)), /unsupported|shared\/interleaved/)
})

test('CLI refuses existing, public, and symlinked public output directories', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-candidate-guards-'))
  try {
    fs.symlinkSync(path.join(root, 'urai-tier1/public'), path.join(temporary, 'public-link'))
    for (const output of [temporary, path.join(root, 'urai-tier1/public/new-candidate'), path.join(temporary, 'public-link/new-candidate')]) {
      const result = spawnSync(process.execPath, ['scripts/prepare-asset-meshopt-candidates.mjs', '--out-dir', output], { cwd: root, encoding: 'utf8' })
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /fresh and outside|symlink resolves inside/)
      assert.equal(fs.existsSync(path.join(root, 'urai-tier1/public/new-candidate')), false)
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }) }
})
