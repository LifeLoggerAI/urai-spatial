import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const hook = fs.readFileSync(new URL('../src/spatial/captured-reality/useCapturedRealityReplayEntry.ts', import.meta.url), 'utf8')
const replay = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const functions = fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const privacy = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')

test('Replay discovers captured places only through authenticated server authority', () => {
  assert.match(hook, /onAuthStateChanged/)
  assert.match(hook, /getCapturedRealityReplayEntry/)
  assert.match(hook, /memoryId/)
  assert.doesNotMatch(hook, /demo.*asset/i)
})

test('server entry requires release gate, dual consent, same owner binding and accepted source-backed asset', () => {
  assert.match(functions, /getCapturedRealityReplayEntry/)
  assert.match(functions, /capturedRealityEnabled\(\)/)
  assert.match(functions, /requireLocationRuntimeConsent\(uid\)/)
  assert.match(functions, /capturedRealityReplayBindings/)
  assert.match(functions, /ownerId/)
  assert.match(functions, /reviewState.*accepted/)
  assert.match(functions, /truthClass.*spatially-reconstructable/)
})

test('Replay shows no captured-place action without an authorized binding', () => {
  assert.match(replay, /useCapturedRealityReplayEntry/)
  assert.match(replay, /capturedRealityEntry\?\.href/)
  assert.match(replay, /Enter captured place/)
})

test('captured replay bindings participate in export/deletion lifecycle', () => {
  assert.match(privacy, /capturedRealityReplayBindings/)
})

test('Functions index exports replay entry authority', () => {
  assert.match(index, /getCapturedRealityReplayEntry/)
})
