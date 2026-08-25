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
const homeWorld = read('src/spatial/layout/HomeWorldProductionSacred.tsx')
const audioRuntime = read('src/spatial/audio/SpatialAmbientRuntime.tsx')
const audioController = read('src/spatial/audio/useAudioController.ts')
const receipt = JSON.parse(read('../operations/assets/production-receipts/sensory-layer-v1.json'))
const audioReceipt = JSON.parse(read('../operations/assets/production-receipts/spatial-audio-production-v1.json'))

const productionAudioFiles = [
  'home-ambient-v1.opus',
  'ground-ambient-v1.opus',
  'life-map-ambient-v1.opus',
  'focus-ambient-v1.opus',
  'replay-ambient-v1.opus',
  'portal-transition-v1.opus',
  'orb-confirm-v1.opus',
  'ui-error-v1.opus',
]

test('evidence-backed sensory assets and production audio are ready', () => {
  assert.match(manifest, /materials:[\s\S]*status: 'ready'/)
  assert.match(manifest, /particles:[\s\S]*status: 'ready'/)
  assert.match(manifest, /loading:[\s\S]*status: 'ready'/)
  assert.match(manifest, /skybox:[\s\S]*status: 'candidate'/)
  assert.match(manifest, /ambientAudio:[\s\S]*id: 'production-spatial-audio-v1'[\s\S]*status: 'ready'/)
  for (const fileName of productionAudioFiles) assert.match(manifest, new RegExp(fileName.replaceAll('.', '\\.')))
  assert.doesNotMatch(manifest, /urai-ambient-bed-v1\.opus/)
})

test('active spatial routes consume promoted visual sensory component and shared production audio runtime', () => {
  assert.match(worldLayer, /import SpatialSensoryLayer from ["']\.\/SpatialSensoryLayer["']/)
  assert.match(worldLayer, /<SpatialSensoryLayer \/>/)
  assert.doesNotMatch(worldLayer, /function SpatialSensoryLayer\s*\(/)
  assert.equal((sensoryLayer.match(/function SpatialSensoryLayer\s*\(/g) ?? []).length, 1)
  assert.match(sensoryLayer, /global-cinematic-material-pack-v1|materialPath/)
  assert.match(sensoryLayer, /spatial-particle-atlas-v1|particlePath/)
  assert.match(sensoryLayer, /urai-loading-sequence-v1|loadingPath/)
  for (const fileName of productionAudioFiles) assert.match(audioController, new RegExp(fileName.replaceAll('.', '\\.')))
  assert.match(audioRuntime, /urai:spatial-audio-consent-v1/)
  assert.match(audioRuntime, /urai:spatial-audio-muted-v1/)
})

test('production sensory receipt includes verified audio while unpromoted skybox stays excluded', () => {
  assert.equal(receipt.releaseState, 'production-integrated-candidate')
  assert.equal(receipt.verificationResult, 'pending-exact-head-ci')
  assert.deepEqual(receipt.assets.map((asset) => asset.id).sort(), [
    'global-cinematic-material-pack-v1',
    'spatial-particle-atlas-v1',
    'urai-loading-sequence-v1',
  ])
  assert.ok(receipt.assets.every((asset) => asset.status === 'ready'))
  assert.equal(receipt.integratedProductionAudio?.id, 'production-spatial-audio-v1')
  assert.equal(receipt.integratedProductionAudio?.status, 'ready')
  assert.equal(receipt.integratedProductionAudio?.assetCount, 8)
  assert.equal(receipt.integratedProductionAudio?.mutedByDefaultUntilConsent, true)
  assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'life-map-galaxy-skybox-v1'))
  assert.ok(!receipt.excludedCandidates.some((asset) => asset.id === 'urai-ambient-bed-v1'))
  assert.equal(audioReceipt.verification?.passed, true)
  assert.equal(audioReceipt.historicalEightSecondProofBedPromoted, false)
  assert.equal(audioReceipt.assets?.length, 8)
})

test('sensory fallbacks remain explicit, abortable, null-safe, and fail-closed', () => {
  assert.match(manifest, /runtime-default-materials/)
  assert.match(manifest, /shader-point-particles/)
  assert.match(manifest, /accessible-static-loading-state/)
  assert.match(manifest, /silent-audio-with-user-controlled-enable/)
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

test('production audio remains consent-controlled on the live Sacred Home owner', () => {
  const liveHome = `${homeRouteOwner}\n${homeWorldEntry}\n${homeWorld}`
  assert.match(homeRouteOwner, /HomeWorldProduction/)
  assert.match(homeWorldEntry, /export \{ HomeWorldProductionSacred as HomeWorldProduction \} from "\.\/HomeWorldProductionSacred"/)
  assert.match(homeWorld, /data-home-visible-world="moonlit-sacred-tech-sanctuary"/)
  assert.doesNotMatch(sensoryLayer, /urai-ambient-bed-v1/)
  assert.doesNotMatch(worldLayer, /urai-ambient-bed-v1/)
  assert.doesNotMatch(liveHome, /urai-ambient-bed-v1\.opus/)
  assert.doesNotMatch(homeWorld, /<audio\b/)
  assert.match(homeWorld, /data-home-audio="production-opus-consent-controlled"/)
  assert.match(audioRuntime, /data-audio-consent/)
  assert.match(audioRuntime, /data-audio-muted/)
  assert.match(audioRuntime, /if \(!enabled\)[\s\S]*audio\.stopAllAudio\(\)/)
})
