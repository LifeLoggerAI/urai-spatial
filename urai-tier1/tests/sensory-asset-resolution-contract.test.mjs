import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const manifest = read('src/spatial/assets/sensoryAssetManifest.ts')
const sensoryLayer = read('src/spatial/scene/SpatialSensoryLayer.tsx')
const worldLayer = read('src/spatial/scene/SpatialWorldAssetLayer.tsx')
const homeRouteOwner = read('src/app/AssetDrivenHomeWorld.tsx')
const homeWorldEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeWorld = read('src/spatial/layout/HomeWorldProductionFinal.tsx')
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
  assert.ok(receipt.assets.every((asset) => asset.status === 'ready'))
  assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'urai-ambient-bed-v1'))
  assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'life-map-galaxy-skybox-v1'))
})

test('sensory fallbacks remain explicit, abortable, null-safe, and fail-closed', () => {
  assert.match(manifest, /runtime-default-materials/)
  assert.match(manifest, /shader-point-particles/)
  assert.match(manifest, /accessible-static-loading-state/)
  assert.match(manifest, /return asset\.status === 'ready' \? asset\.path : null/)
  assert.match(sensoryLayer, /if \(!materialPath \|\| !particlePath \|\| !loadingPath\) return null/)
  assert.match(sensoryLayer, /data-urai-fallback="procedural"/)
  assert.match(sensoryLayer, /new THREE\.TextureLoader\(\)/)
  assert.match(sensoryLayer, /new AbortController\(\)/)
  assert.match(sensoryLayer, /fetch\(materialPath, \{ signal \}\)/)
  assert.match(sensoryLayer, /fetch\(loadingPath, \{ signal \}\)/)
  assert.match(sensoryLayer, /controller\.abort\(\)/)
  assert.match(sensoryLayer, /materialPack\?\.materials/)
  assert.match(sensoryLayer, /loadingSequence\?\.durationMs/)
  assert.ok(sensoryLayer.includes('key={`${materialPath}|${particlePath}|${loadingPath}`}'))
  assert.doesNotMatch(sensoryLayer, /Promise\.all/)
  assert.doesNotMatch(sensoryLayer, /throw new Error\('URAI sensory assets are not promoted'\)/)
})

test('loading animation timing is relative to the mounted sensory layer', () => {
  assert.match(sensoryLayer, /loadingStartedAtMs = useRef<number \| null>\(null\)/)
  assert.match(sensoryLayer, /if \(loadingStartedAtMs\.current === null\) loadingStartedAtMs\.current = elapsedMs/)
  assert.match(sensoryLayer, /elapsedMs - loadingStartedAtMs\.current/)
  assert.doesNotMatch(sensoryLayer, /\(clock\.elapsedTime \* 1000\) \/ loadingDurationMs/)
})

test('candidate ambient audio remains fail-closed on the live Home owner', () => {
  const liveHome = `${homeRouteOwner}\n${homeWorldEntry}\n${homeWorld}`
  assert.match(homeRouteOwner, /HomeWorldProduction/)
  assert.match(homeWorldEntry, /export \{ HomeWorldProductionFinal as HomeWorldProduction \} from "\.\/HomeWorldProductionFinal"/)
  assert.doesNotMatch(sensoryLayer, /urai-ambient-bed-v1/)
  assert.doesNotMatch(worldLayer, /urai-ambient-bed-v1/)
  assert.doesNotMatch(liveHome, /urai-ambient-bed-v1\.opus/)
  assert.doesNotMatch(homeWorld, /<audio\b/)
  assert.match(homeWorld, /data-home-audio="silent-fallback"/)
})
