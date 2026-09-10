import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const assetUrl = new URL('../public/assets/urai/life-map-production/authored-v211/life-map-memory-sanctuary-v211.glb', import.meta.url)
const source = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const generator = readFileSync(new URL('../scripts/blender/generate-life-map-sanctuary-v211.py', import.meta.url), 'utf8')
const provenance = JSON.parse(readFileSync(new URL('../public/assets/urai/life-map-production/authored-v211/provenance.json', import.meta.url), 'utf8'))

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

test('V211 delivers a complete optimized Blender-authored Life Map sanctuary', () => {
  const { bytes, json } = inspectGlb()
  assert.ok(statSync(assetUrl).size > 200_000)
  assert.ok(bytes.length < 500_000, 'optimized web derivative must remain below the governed transport budget')
  assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'))
  assert.ok(json.images?.some((image) => image.mimeType === 'image/webp'))
  assert.ok(json.nodes?.some((node) => node.name === 'life-map-v211-continuous-eroded-memory-sanctuary'))
  assert.ok(json.nodes?.some((node) => node.name === 'life-map-v211-localized-memory-emission-1'))
  assert.ok(json.meshes?.length >= 5)
  assert.ok(!json.nodes?.some((node) => /collision-proxy|SOURCE_/i.test(node.name || '')))
  for (const sourceRole of [
    'life-map-v211-lineage-weathered-terrace',
    'life-map-v211-relationship-folded-escarpment',
    'life-map-v211-accumulated-life-ridge',
  ]) assert.ok(generator.includes(sourceRole), `${sourceRole} must remain in editable source authority`)
})

test('V211 source authority remains reproducible after the runtime successor advances', () => {
  assert.match(source, /V226 literal-pixel authority: a suspended living memory galaxy/)
  assert.match(source, /function smoothMemoryGeometry\(/)
  assert.match(source, /<primitive object=\{hiddenAsset\} visible=\{false\} \/>/)
  assert.doesNotMatch(source, /life-map-production\/authored-v211\/life-map-memory-sanctuary-v211\.glb/)
  assert.match(generator, /def blender_point\(x, y, z\)/)
  assert.match(generator, /apply_packed_strata_texture/)
  assert.match(generator, /camera-safe-traversal-collision-proxy/)
  assert.equal(provenance.sha256, '7990fae5ff5ca602fdac4485cbffa0035e76122dec1227754dcd0c58e79534ea')
  assert.deepEqual(provenance.externalAssets, [])
})
