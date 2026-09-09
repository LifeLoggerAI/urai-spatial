import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const assetUrl = new URL('../public/assets/urai/life-map-production/authored-v210/life-map-memory-sanctuary-v210.glb', import.meta.url)
const source = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const generator = readFileSync(new URL('../scripts/blender/generate-life-map-sanctuary-v210.py', import.meta.url), 'utf8')
const provenance = JSON.parse(readFileSync(new URL('../public/assets/urai/life-map-production/authored-v210/provenance.json', import.meta.url), 'utf8'))

function inspectGlb() {
  const bytes = readFileSync(assetUrl)
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  let offset = 12
  let json
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(offset + 8, offset + 8 + length).toString('utf8'))
    offset += 8 + length
  }
  assert.ok(json)
  return { bytes, json }
}

test('V210 delivers a complete optimized Blender-authored Life Map sanctuary', () => {
  const { bytes, json } = inspectGlb()
  assert.ok(statSync(assetUrl).size > 200_000)
  assert.ok(bytes.length < 500_000, 'optimized web derivative must remain below the governed transport budget')
  assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'))
  assert.ok(json.images?.some((image) => image.mimeType === 'image/webp'))
  assert.ok(json.nodes?.some((node) => node.name === 'life-map-v210-continuous-eroded-memory-sanctuary'))
  assert.ok(json.nodes?.some((node) => node.name === 'life-map-v210-localized-memory-emission-1'))
  assert.ok(json.meshes?.length >= 5)
  assert.ok(!json.nodes?.some((node) => /collision-proxy|SOURCE_/i.test(node.name || '')))
  for (const sourceRole of [
    'life-map-v210-lineage-eroded-relief',
    'life-map-v210-accumulated-ascent',
    'life-map-v210-distant-history-landmark',
  ]) assert.ok(generator.includes(sourceRole), `${sourceRole} must remain in editable source authority`)
})

test('V210 source authority remains reproducible after the runtime successor advances', () => {
  assert.match(source, /life-map-production\/authored-v215\/life-map-memory-sanctuary-v215\.glb/)
  assert.match(source, /name="life-map-v215-blender-authored-memory-sanctuary"/)
  assert.match(source, /position=\{\[0, 0, 0\]\}/)
  assert.match(source, /scale=\{\[1, 1, 1\]\}/)
  assert.match(generator, /def blender_point\(x, y, z\)/)
  assert.match(generator, /apply_packed_strata_texture/)
  assert.match(generator, /camera-safe-traversal-collision-proxy/)
  assert.equal(provenance.sha256, 'bb08584a9364a011248886f97ee8d147bab0c5b0470afc0fb96becd7a02ee081')
  assert.deepEqual(provenance.externalAssets, [])
})
