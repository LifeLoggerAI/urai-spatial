import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../public/assets/urai/home-production/authored-v191/', import.meta.url)
const assets = [
  ['home-continuous-landscape-v191.glb', 1, 1],
  ['home-ground-place-v191.glb', 3, 1],
  ['home-life-map-place-v191.glb', 3, 1],
  ['urai-living-memory-heart-v191.glb', 1, 1],
]

function inspectGlb(name) {
  const bytes = readFileSync(new URL(name, root))
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', `${name} must be a GLB`)
  assert.equal(bytes.readUInt32LE(4), 2, `${name} must use GLB 2.0`)
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${name} header length must equal stored bytes`)

  const jsonLength = bytes.readUInt32LE(12)
  assert.equal(bytes.toString('ascii', 16, 20), 'JSON')
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').trim())
  const binHeader = 20 + jsonLength
  assert.equal(bytes.toString('ascii', binHeader + 4, binHeader + 8), 'BIN\0')
  assert.equal(binHeader + 8 + bytes.readUInt32LE(binHeader), bytes.length, `${name} binary chunk must be complete`)
  assert.equal(json.buffers[0].byteLength, bytes.readUInt32LE(binHeader), `${name} JSON and binary lengths must agree`)
  return { bytes, json }
}

test('authored V191 GLBs are complete, loadable, and transport-safe', () => {
  for (const [name, meshCount, materialCount] of assets) {
    const { bytes, json } = inspectGlb(name)
    assert.ok(bytes.length < 750_000, `${name} must remain below the governed binary transport ceiling`)
    assert.equal(json.meshes.length, meshCount, `${name} mesh inventory changed`)
    assert.equal(json.materials.length, materialCount, `${name} material inventory changed`)
    assert.ok(json.accessors.every((accessor) => accessor.count > 0), `${name} contains an empty accessor`)
  }
})

test('authored landscape retains production density after transport-safe optimization', () => {
  const { json } = inspectGlb('home-continuous-landscape-v191.glb')
  const position = json.accessors[json.meshes[0].primitives[0].attributes.POSITION]
  const indices = json.accessors[json.meshes[0].primitives[0].indices]
  assert.ok(position.count > 11_000, 'landscape must retain more than 11k authored vertices')
  assert.ok(indices.count > 65_000, 'landscape must retain more than 65k authored triangle indices')
})
