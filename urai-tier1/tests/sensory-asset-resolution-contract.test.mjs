import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const manifest = read('src/spatial/assets/sensoryAssetManifest.ts')
const sensoryLayer = read('src/spatial/scene/SpatialSensoryLayer.tsx')
const worldLayer = read('src/spatial/scene/SpatialWorldAssetLayer.tsx')

test('only evidence-backed sensory assets are ready', () => {
  assert.match(manifest, /materials:[\s\S]*status: 'ready'/)
  assert.match(manifest, /particles:[\s\S]*status: 'ready'/)
  assert.match(manifest, /loading:[\s\S]*status: 'ready'/)
  assert.match(manifest, /skybox:[\s\S]*status: 'candidate'/)
  assert.match(manifest, /ambientAudio:[\s\S]*status: 'candidate'/)
})

test('active spatial routes consume one promoted sensory authority', () => {
  assert.match(worldLayer, /import SpatialSensoryLayer from ["']\.\/SpatialSensoryLayer["']/)
  assert.match(worldLayer, /<SpatialSensoryLayer \/>/)
  assert.doesNotMatch(worldLayer, /function SpatialSensoryLayer\(/)
  assert.match(sensoryLayer, /global-cinematic-material-pack-v1|materialPath/)
  assert.match(sensoryLayer, /spatial-particle-atlas-v1|particlePath/)
  assert.match(sensoryLayer, /urai-loading-sequence-v1|loadingPath/)
})

test('sensory activation and runtime loading preserve procedural fallback', () => {
  assert.match(manifest, /runtime-default-materials/)
  assert.match(manifest, /shader-point-particles/)
  assert.match(manifest, /accessible-static-loading-state/)
  assert.match(manifest, /return asset\.status === 'ready' \? asset\.path : null/)
  assert.match(sensoryLayer, /if \(!materialPath \|\| !particlePath \|\| !loadingPath\) return null/)
  assert.match(sensoryLayer, /data-urai-fallback="procedural"/)
  assert.match(sensoryLayer, /new THREE\.TextureLoader\(\)/)
  assert.match(sensoryLayer, /fetch\(materialPath\)/)
  assert.match(sensoryLayer, /fetch\(loadingPath\)/)
  assert.doesNotMatch(sensoryLayer, /throw new Error\('URAI sensory assets are not promoted'\)/)
})

test('candidate ambient audio is not mounted as a production asset', () => {
  assert.doesNotMatch(sensoryLayer, /urai-ambient-bed-v1/)
  assert.doesNotMatch(worldLayer, /urai-ambient-bed-v1/)
})
