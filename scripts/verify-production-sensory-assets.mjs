#!/usr/bin/env node
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = {
  atlas: 'urai-tier1/public/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
  materials: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  loading: 'urai-tier1/public/assets/urai/generated/loading/urai-loading-sequence-v1.json',
  manifest: 'urai-tier1/src/spatial/assets/sensoryAssetManifest.ts',
  sensoryLayer: 'urai-tier1/src/spatial/scene/SpatialSensoryLayer.tsx',
  consumer: 'urai-tier1/src/spatial/scene/SpatialWorldAssetLayer.tsx',
  receipt: 'operations/assets/production-receipts/sensory-layer-v1.json',
}

const read = (key) => fs.readFileSync(path.join(root, files[key]))
const text = (key) => read(key).toString('utf8')
const sha256 = (payload) => crypto.createHash('sha256').update(payload).digest('hex')

const atlas = text('atlas')
assert.match(atlas, /^<svg[^>]+width="1024"[^>]+height="1024"/)
assert.match(atlas, /<\/svg>\s*$/)
assert.equal((atlas.match(/<circle /g) ?? []).length, 4)
assert.ok(read('atlas').length <= 524288)

const materials = JSON.parse(text('materials'))
assert.equal(materials.schemaVersion, 1)
assert.equal(materials.version, 'global-cinematic-material-pack-v1')
assert.ok(materials.materials.portalEnergy.baseColor)
assert.ok(materials.materials.memoryViolet.baseColor)
assert.ok(read('materials').length <= 262144)

const loading = JSON.parse(text('loading'))
assert.equal(loading.version, 'urai-loading-sequence-v1')
assert.equal(loading.durationMs, 2200)
assert.equal(loading.frames.at(-1).state, 'complete')
assert.equal(loading.frames.at(-1).opacity, 0)
assert.ok(read('loading').length <= 262144)

const manifest = text('manifest')
assert.match(manifest, /materials:[\s\S]*status: 'ready'/)
assert.match(manifest, /particles:[\s\S]*status: 'ready'/)
assert.match(manifest, /loading:[\s\S]*status: 'ready'/)
assert.match(manifest, /skybox:[\s\S]*status: 'candidate'/)
assert.match(manifest, /ambientAudio:[\s\S]*status: 'candidate'/)

const sensoryLayer = text('sensoryLayer')
assert.match(sensoryLayer, /if \(!materialPath \|\| !particlePath \|\| !loadingPath\) return null/)
assert.match(sensoryLayer, /new THREE\.TextureLoader\(\)/)
assert.match(sensoryLayer, /fetch\(materialPath\)/)
assert.match(sensoryLayer, /fetch\(loadingPath\)/)
assert.match(sensoryLayer, /data-urai-fallback="procedural"/)
assert.doesNotMatch(sensoryLayer, /throw new Error\('URAI sensory assets are not promoted'\)/)
assert.doesNotMatch(sensoryLayer, /urai-ambient-bed-v1/)

const consumer = text('consumer')
assert.match(consumer, /import SpatialSensoryLayer from ["']\.\/SpatialSensoryLayer["']/)
assert.match(consumer, /<SpatialSensoryLayer \/>/)
assert.doesNotMatch(consumer, /function SpatialSensoryLayer\(/)
assert.doesNotMatch(consumer, /urai-ambient-bed-v1/)

const readyFiles = ['atlas', 'materials', 'loading']
const results = Object.fromEntries(readyFiles.map((key) => {
  const payload = read(key)
  return [key, { path: files[key], bytes: payload.length, sha256: sha256(payload) }]
}))

const receipt = JSON.parse(text('receipt'))
assert.equal(receipt.releaseState, 'ready')
assert.equal(receipt.assets.length, readyFiles.length)
for (const result of Object.values(results)) {
  const entry = receipt.assets.find((asset) => asset.path === result.path)
  assert.ok(entry, `Missing receipt entry: ${result.path}`)
  assert.equal(entry.bytes, result.bytes, `Receipt byte mismatch: ${result.path}`)
  assert.equal(entry.sha256, result.sha256, `Receipt SHA-256 mismatch: ${result.path}`)
}
assert.equal(receipt.assets.some((asset) => /ambient-bed|\.opus$/.test(asset.path)), false)

console.log(JSON.stringify({ ok: true, files: results }, null, 2))
