import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const assetUrl = new URL('../public/assets/urai/life-map-production/authored-v212/life-map-memory-sanctuary-v212.glb', import.meta.url)
const source = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const generator = readFileSync(new URL('../scripts/blender/generate-life-map-sanctuary-v212.py', import.meta.url), 'utf8')
const provenance = JSON.parse(readFileSync(new URL('../public/assets/urai/life-map-production/authored-v212/provenance.json', import.meta.url), 'utf8'))

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

test('V212 delivers a complete optimized Blender-authored Life Map sanctuary', () => {
  const { bytes, json } = inspectGlb()
  assert.ok(statSync(assetUrl).size > 50_000)
  assert.ok(bytes.length < 500_000, 'optimized web derivative must remain below the governed transport budget')
  assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'))
  assert.equal(json.images?.length, 1, 'V212 carries one reproducible packed procedural strata texture')
  assert.ok(json.nodes?.some((node) => node.name === 'life-map-v212-continuous-eroded-memory-sanctuary'))
  assert.ok(json.nodes?.some((node) => node.name === 'life-map-v212-localized-memory-emission-1'))
  assert.ok(json.meshes?.length >= 1)
  assert.ok(!json.nodes?.some((node) => /integrated-geologic-landmark|archive-wall|ascent-wall|folded-escarpment/i.test(node.name || '')))
  assert.ok(!json.nodes?.some((node) => /collision-proxy|SOURCE_/i.test(node.name || '')))
  assert.match(generator, /lineage = 3\.4 \* lineage_mask/)
  assert.match(generator, /archive = 5\.2 \* archive_mask/)
  assert.match(generator, /history = 6\.8 \* history_mask/)
})

test('V212 source authority remains reproducible after the runtime successor advances', () => {
  assert.match(source, /life-map-production\/authored-v215\/life-map-memory-sanctuary-v215\.glb/)
  assert.match(source, /name="life-map-v215-blender-authored-memory-sanctuary"/)
  assert.match(source, /position=\{\[0, 0, 0\]\}/)
  assert.match(source, /scale=\{\[1, 1, 1\]\}/)
  assert.match(generator, /def blender_point\(x, y, z\)/)
  assert.match(generator.slice(generator.indexOf('def main')), /apply_packed_strata_texture\(DEEP\)/)
  assert.match(generator, /camera-safe-traversal-collision-proxy/)
  assert.equal(provenance.sha256, '100149447d2c2b2652d090908067a310f7affe43755c49dc40678860a46eed6f')
  assert.deepEqual(provenance.externalAssets, [])
})
