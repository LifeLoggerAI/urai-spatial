import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const backend = fs.readFileSync(new URL('../../apps/functions/src/interpretiveWorld.ts', import.meta.url), 'utf8')
const route = fs.readFileSync(new URL('../src/app/spatial/interpretive-world/InterpretiveWorldRouteClient.tsx', import.meta.url), 'utf8')
const scene = fs.readFileSync(new URL('../src/spatial/interpretive-world/InterpretiveWorldScene.tsx', import.meta.url), 'utf8')
const adapter = fs.readFileSync(new URL('../src/spatial/interpretive-world/InterpretiveWorldSplat.tsx', import.meta.url), 'utf8')
const replay = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const envExample = fs.readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')

test('generated-world callables are exported under a separate provider surface', () => {
  assert.match(functionsIndex, /getInterpretiveWorldAsset/)
  assert.match(functionsIndex, /getInterpretiveWorldRuntimeUrl/)
  assert.match(functionsIndex, /getInterpretiveWorldReplayEntry/)
  assert.match(functionsIndex, /from '\.\/interpretiveWorld'/)
})

test('backend requires generated-only non-autobiographical authority and separate feature flag', () => {
  assert.match(backend, /URAI_ENABLE_INTERPRETIVE_WORLDS/)
  assert.match(backend, /truthClass'\) === 'interpretive'/)
  assert.match(backend, /autobiographical'\) === false/)
  assert.match(backend, /sourceTruthEligible'\) === false/)
  assert.match(backend, /sourceIds\.length === 0/)
  assert.match(backend, /exactPrivateLocationEmbedded'\) === false/)
  assert.match(backend, /private-interpretive-worlds/)
  assert.doesNotMatch(backend, /requireLocationRuntimeConsent/)
})

test('runtime delivery is hash and storage-generation bound before signing', () => {
  assert.match(backend, /reviewApprovedRuntimeSha256/)
  assert.match(backend, /reviewApprovedStorageGeneration/)
  assert.match(backend, /metadata\.generation/)
  assert.match(backend, /metadata\.metadata\?\.uraiRuntimeSha256/)
  assert.match(backend, /getSignedUrl/)
})

test('route observes revocation authority and never claims autobiography', () => {
  assert.match(route, /interpretiveWorldAssets/)
  assert.match(route, /onSnapshot/)
  assert.match(route, /autobiographical !== false/)
  assert.match(route, /sourceTruthEligible !== false/)
  assert.match(route, /sourceCount !== 0/)
  assert.match(route, /mobileCertified/)
  assert.match(route, /browserCertified/)
  assert.match(route, /data-autobiographical="false"/)
})

test('generated scene truth label remains visible and movement stays bounded without collision authority', () => {
  assert.match(scene, /decision\.truthLabel/)
  assert.match(scene, /data-interpretive-world-autobiographical="false"/)
  assert.match(scene, /enablePan=\{false\}/)
  assert.match(scene, /decision\.embodiedMovementAllowed/)
  assert.match(adapter, /loadingLabel="Loading interpretive world"/)
  assert.match(adapter, /failureMessage="Interpretive world rendering stopped\."/)
})

test('Replay gives real captured places precedence over interpretive worlds', () => {
  assert.match(replay, /const generatedWorldEntry = capturedRealityEntry \? null : interpretiveWorldEntry/)
  assert.match(replay, /Enter captured place/)
  assert.match(replay, /Enter interpretive world/)
})


test('release flags default hard-off in the repository environment example', () => {
  assert.match(envExample, /URAI_ENABLE_CAPTURED_REALITY=false/)
  assert.match(envExample, /URAI_ENABLE_CAPTURED_REALITY_PROOF=false/)
  assert.match(envExample, /URAI_ENABLE_INTERPRETIVE_WORLDS=false/)
})
