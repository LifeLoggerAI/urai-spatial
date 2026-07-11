import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const repoRoot = path.resolve(root, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const manifest = read('src/spatial/assets/sensoryAssetManifest.ts')
const sensoryLayer = read('src/spatial/scene/SpatialSensoryLayer.tsx')
const worldLayer = read('src/spatial/scene/SpatialWorldAssetLayer.tsx')
const receipt = JSON.parse(read('../operations/assets/production-receipts/sensory-layer-v1.json'))

test('only evidence-backed sensory assets are ready', () => {
  assert.match(manifest, /materials:[\s\S]*status: 'ready'/)
  assert.match(manifest, /particles:[\s\S]*status: 'ready'/)
  assert.match(manifest, /loading:[\s\S]*status: 'ready'/)
  assert.match(manifest, /skybox:[\s\S]*status: 'candidate'/)
  assert.match(manifest, /ambientAudio:[\s\S]*status: 'candidate'/)
})

test('active spatial routes consume one promoted sensory component', () => {
  assert.match(worldLayer, /import SpatialSensoryLayer from ["']\.\/SpatialSensoryLayer["']/)
  assert.match(worldLayer, /<SpatialSensoryLayer \/>/)
  assert.doesNotMatch(worldLayer, /function SpatialSensoryLayer\s*\(/)
  assert.equal((sensoryLayer.match(/function SpatialSensoryLayer\s*\(/g) ?? []).length, 1)
  assert.match(sensoryLayer, /global-cinematic-material-pack-v1|materialPath/)
  assert.match(sensoryLayer, /spatial-particle-atlas-v1|particlePath/)
  assert.match(sensoryLayer, /urai-loading-sequence-v1|loadingPath/)
})

test('candidate assets cannot appear in the production-ready receipt set', () => {
  assert.equal(receipt.releaseState, 'candidate')
  assert.equal(receipt.verificationResult, 'pending-exact-head-ci')
  assert.deepEqual(receipt.assets.map((asset) => asset.id).sort(), [
    'global-cinematic-material-pack-v1',
    'spatial-particle-atlas-v1',
    'urai-loading-sequence-v1',
  ])
  assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'urai-ambient-bed-v1'))
  assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'life-map-galaxy-skybox-v1'))
})

test('sensory fallbacks remain explicit and activation is fail-closed', () => {
  assert.match(manifest, /runtime-default-materials/)
  assert.match(manifest, /shader-point-particles/)
  assert.match(manifest, /accessible-static-loading-state/)
  assert.match(manifest, /return asset\.status === 'ready' \? asset\.path : null/)
})

test('missing promoted sensory paths preserve the procedural world instead of crashing module import', () => {
  assert.doesNotMatch(sensoryLayer, /throw new Error\(['"]URAI sensory assets are not promoted['"]\)/)
  assert.match(
    sensoryLayer,
    /if \(!materialPath \|\| !particlePath \|\| !loadingPath\) \{\s*return null\s*\}/,
  )
  assert.match(sensoryLayer, /type PromotedSpatialSensoryLayerProps = \{[\s\S]*materialPath: string[\s\S]*particlePath: string[\s\S]*loadingPath: string/)
  assert.match(sensoryLayer, /<PromotedSpatialSensoryLayer[\s\S]*materialPath=\{materialPath\}[\s\S]*particlePath=\{particlePath\}[\s\S]*loadingPath=\{loadingPath\}/)
})

test('production sensory verifiers pass on the exact checked-out source and receipt bytes', () => {
  for (const script of [
    'scripts/verify-production-sensory-assets.mjs',
    'scripts/verify-promoted-sensory-assets.mjs',
  ]) {
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, `${script} failed:\n${result.stdout}\n${result.stderr}`)
  }
})
