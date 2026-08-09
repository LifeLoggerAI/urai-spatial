#!/usr/bin/env node
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readyFiles = {
  atlas: 'urai-tier1/public/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
  materials: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  loading: 'urai-tier1/public/assets/urai/generated/loading/urai-loading-sequence-v1.json',
}
const contractFiles = {
  consumer: 'urai-tier1/src/spatial/scene/SpatialWorldAssetLayer.tsx',
  component: 'urai-tier1/src/spatial/scene/SpatialSensoryLayer.tsx',
  manifest: 'urai-tier1/src/spatial/assets/sensoryAssetManifest.ts',
  receipt: 'operations/assets/production-receipts/sensory-layer-v1.json',
  audioReceipt: 'operations/assets/production-receipts/spatial-audio-production-v1.json',
  audioRuntime: 'urai-tier1/src/spatial/audio/SpatialAmbientRuntime.tsx',
  audioController: 'urai-tier1/src/spatial/audio/useAudioController.ts',
  homeWorld: 'urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx',
}
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

const readPath = (relative) => fs.readFileSync(path.join(root, relative))
const textPath = (relative) => readPath(relative).toString('utf8')
const sha256 = (payload) => crypto.createHash('sha256').update(payload).digest('hex')

const atlas = textPath(readyFiles.atlas)
assert.match(atlas, /^<svg[^>]+width="1024"[^>]+height="1024"/)
assert.match(atlas, /<\/svg>\s*$/)
assert.equal((atlas.match(/<circle /g) ?? []).length, 4)
assert.ok(readPath(readyFiles.atlas).length <= 524288)

const materials = JSON.parse(textPath(readyFiles.materials))
assert.equal(materials.schemaVersion, 1)
assert.equal(materials.version, 'global-cinematic-material-pack-v1')
assert.ok(materials.materials.portalEnergy.baseColor)
assert.ok(materials.materials.memoryViolet.baseColor)
assert.ok(readPath(readyFiles.materials).length <= 262144)

const loading = JSON.parse(textPath(readyFiles.loading))
assert.equal(loading.version, 'urai-loading-sequence-v1')
assert.equal(loading.durationMs, 2200)
assert.equal(loading.frames.at(-1).state, 'complete')
assert.equal(loading.frames.at(-1).opacity, 0)
assert.ok(readPath(readyFiles.loading).length <= 262144)

const consumer = textPath(contractFiles.consumer)
const component = textPath(contractFiles.component)
const manifest = textPath(contractFiles.manifest)
const receipt = JSON.parse(textPath(contractFiles.receipt))
const audioReceipt = JSON.parse(textPath(contractFiles.audioReceipt))
const audioRuntime = textPath(contractFiles.audioRuntime)
const audioController = textPath(contractFiles.audioController)
const homeWorld = textPath(contractFiles.homeWorld)

assert.match(consumer, /import SpatialSensoryLayer from ["']\.\/SpatialSensoryLayer["']/)
assert.match(consumer, /<SpatialSensoryLayer \/>/)
assert.doesNotMatch(consumer, /function SpatialSensoryLayer\s*\(/)
assert.doesNotMatch(consumer, /urai-ambient-bed-v1/)

assert.equal((component.match(/function SpatialSensoryLayer\s*\(/g) ?? []).length, 1)
assert.match(component, /if \(!materialPath \|\| !particlePath \|\| !loadingPath\) return null/)
assert.match(component, /new THREE\.TextureLoader\(\)/)
assert.match(component, /new AbortController\(\)/)
assert.match(component, /fetch\(materialPath, \{ signal \}\)/)
assert.match(component, /fetch\(loadingPath, \{ signal \}\)/)
assert.match(component, /controller\.abort\(\)/)
assert.match(component, /materialPack\?\.materials/)
assert.match(component, /loadingSequence\?\.durationMs/)
assert.match(component, /data-urai-fallback="procedural"/)
assert.ok(component.includes('key={`${materialPath}|${particlePath}|${loadingPath}`}'))
assert.doesNotMatch(component, /Promise\.all/)
assert.doesNotMatch(component, /throw new Error\('URAI sensory assets are not promoted'\)/)
assert.doesNotMatch(component, /urai-ambient-bed-v1/)

for (const key of ['materials', 'particles', 'loading', 'ambientAudio']) {
  assert.match(manifest, new RegExp(`${key}:[\\s\\S]*status: 'ready'`))
}
assert.match(manifest, /skybox:[\s\S]*status: 'candidate'/)
for (const fileName of productionAudioFiles) assert.match(manifest, new RegExp(fileName.replaceAll('.', '\\.')))
assert.doesNotMatch(manifest, /urai-ambient-bed-v1\.opus/)

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
assert.ok(!receipt.excludedCandidates.some((asset) => asset.id === 'urai-ambient-bed-v1'))
assert.ok(receipt.excludedCandidates.some((asset) => asset.id === 'life-map-galaxy-skybox-v1'))

assert.equal(audioReceipt.schemaVersion, 'urai-spatial-production-audio-1')
assert.equal(audioReceipt.verification?.passed, true)
assert.equal(audioReceipt.historicalEightSecondProofBedPromoted, false)
assert.equal(audioReceipt.assets?.length, 8)
assert.equal(audioReceipt.assets.filter((asset) => asset.role === 'ambient').length, 5)
assert.ok(audioReceipt.assets.filter((asset) => asset.role === 'ambient').every((asset) => asset.durationSeconds >= 59))
assert.ok(audioReceipt.assets.every((asset) => asset.codec === 'opus' && asset.channels === 2))
assert.ok(audioReceipt.assets.every((asset) => asset.integratedLufs <= -16 && asset.truePeakDbtp <= -1))
for (const asset of audioReceipt.assets) {
  const relative = `urai-tier1/public${asset.path}`
  const payload = readPath(relative)
  assert.equal(payload.length, asset.bytes, `Audio byte count mismatch: ${asset.id}`)
  assert.equal(sha256(payload), asset.sha256, `Audio SHA-256 mismatch: ${asset.id}`)
  assert.ok(asset.caption?.length > 0, `Audio caption metadata missing: ${asset.id}`)
}

for (const fileName of productionAudioFiles) assert.match(audioController, new RegExp(fileName.replaceAll('.', '\\.')))
assert.doesNotMatch(audioController, /\/audio\/ambient\//)
assert.match(audioRuntime, /urai:spatial-audio-consent-v1/)
assert.match(audioRuntime, /urai:spatial-audio-muted-v1/)
assert.match(audioRuntime, /data-audio-consent/)
assert.match(audioRuntime, /data-audio-muted/)
assert.match(homeWorld, /data-home-audio="production-opus-consent-controlled"/)

for (const asset of receipt.assets) {
  const payload = readPath(asset.path)
  assert.equal(payload.length, asset.bytes, `Byte count mismatch: ${asset.id}`)
  assert.equal(sha256(payload), asset.sha256, `SHA-256 mismatch: ${asset.id}`)
}

console.log(JSON.stringify({
  ok: true,
  releaseState: receipt.releaseState,
  verificationResult: receipt.verificationResult,
  readyAssets: [...receipt.assets.map((asset) => asset.id), receipt.integratedProductionAudio.id],
  excludedCandidates: receipt.excludedCandidates.map((asset) => asset.id),
  productionAudio: {
    assets: audioReceipt.assets.length,
    ambient: audioReceipt.assets.filter((asset) => asset.role === 'ambient').length,
    verified: audioReceipt.verification.passed,
  },
  files: Object.fromEntries(Object.entries(readyFiles).map(([key, relative]) => {
    const payload = readPath(relative)
    return [key, { path: relative, bytes: payload.length, sha256: sha256(payload) }]
  })),
}, null, 2))
