#!/usr/bin/env node
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = [
  'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  'urai-tier1/public/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
  'urai-tier1/public/assets/urai/generated/loading/urai-loading-sequence-v1.json',
]

const results = files.map((relativePath) => {
  const payload = fs.readFileSync(path.join(root, relativePath))
  return {
    path: relativePath,
    bytes: payload.length,
    sha256: crypto.createHash('sha256').update(payload).digest('hex'),
  }
})

const materialPack = JSON.parse(fs.readFileSync(path.join(root, files[0]), 'utf8'))
assert.equal(materialPack.schemaVersion, 1)
assert.equal(materialPack.version, 'global-cinematic-material-pack-v1')
assert.ok(materialPack.materials.portalEnergy)
assert.ok(materialPack.materials.memoryViolet)

const particleAtlas = fs.readFileSync(path.join(root, files[1]), 'utf8')
assert.match(particleAtlas, /width="1024" height="1024"/)
assert.match(particleAtlas, /radialGradient/)
assert.equal((particleAtlas.match(/<circle /g) ?? []).length, 4)

const loadingSequence = JSON.parse(fs.readFileSync(path.join(root, files[2]), 'utf8'))
assert.equal(loadingSequence.durationMs, 2200)
assert.equal(loadingSequence.frames.at(-1)?.state, 'complete')
assert.equal(loadingSequence.frames.at(-1)?.opacity, 0)

const sensoryManifest = fs.readFileSync(path.join(root, 'urai-tier1/src/spatial/assets/sensoryAssetManifest.ts'), 'utf8')
const sensoryLayer = fs.readFileSync(path.join(root, 'urai-tier1/src/spatial/scene/SpatialSensoryLayer.tsx'), 'utf8')
const worldLayer = fs.readFileSync(path.join(root, 'urai-tier1/src/spatial/scene/SpatialWorldAssetLayer.tsx'), 'utf8')
const receipt = JSON.parse(fs.readFileSync(path.join(root, 'operations/assets/production-receipts/sensory-layer-v1.json'), 'utf8'))

for (const id of ['global-cinematic-material-pack-v1', 'spatial-particle-atlas-v1', 'urai-loading-sequence-v1']) {
  assert.match(sensoryManifest, new RegExp(id))
}
assert.match(sensoryLayer, /if \(!materialPath \|\| !particlePath \|\| !loadingPath\) return null/)
assert.match(sensoryLayer, /new THREE\.TextureLoader\(\)/)
assert.match(sensoryLayer, /fetch\(materialPath\)/)
assert.match(sensoryLayer, /fetch\(loadingPath\)/)
assert.ok(sensoryLayer.includes('key={`${materialPath}|${particlePath}|${loadingPath}`}'))
assert.doesNotMatch(sensoryLayer, /Promise\.all/)
assert.doesNotMatch(sensoryLayer, /throw new Error\('URAI sensory assets are not promoted'\)/)
assert.match(worldLayer, /import SpatialSensoryLayer from ["']\.\/SpatialSensoryLayer["']/)
assert.match(worldLayer, /<SpatialSensoryLayer \/>/)
assert.doesNotMatch(worldLayer, /function SpatialSensoryLayer\s*\(/)
assert.doesNotMatch(worldLayer, /urai-ambient-bed-v1/)
assert.match(sensoryManifest, /skybox:[\s\S]*status: 'candidate'/)
assert.match(sensoryManifest, /ambientAudio:[\s\S]*status: 'candidate'/)

assert.equal(receipt.releaseState, 'candidate')
assert.equal(receipt.verificationResult, 'pending-exact-head-ci')
assert.equal(receipt.assets.length, results.length)
for (const result of results) {
  const entry = receipt.assets.find((asset) => asset.path === result.path)
  assert.ok(entry, `Missing receipt entry: ${result.path}`)
  assert.equal(entry.status, 'ready')
  assert.equal(entry.bytes, result.bytes)
  assert.equal(entry.sha256, result.sha256)
}
assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'urai-ambient-bed-v1'))
assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'life-map-galaxy-skybox-v1'))

console.log(JSON.stringify({
  ok: true,
  releaseState: receipt.releaseState,
  verificationResult: receipt.verificationResult,
  assets: results,
}, null, 2))
