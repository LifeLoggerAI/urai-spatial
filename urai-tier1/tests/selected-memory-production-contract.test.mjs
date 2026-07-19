import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const contract = read('src/spatial/memory/selectedMemoryContract.ts')
const hook = read('src/spatial/memory/useSelectedMemory.ts')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')

test('production memory loading never silently substitutes demo or seed content', () => {
  assert.doesNotMatch(hook, /lifeMapNodes|seed|quiet-reset|replay-recovery-thread|seed-memory-bloom/)
  assert.match(hook, /firebasePublicEnvReady/)
  assert.match(hook, /Sign in to open this private memory/)
  assert.match(hook, /Selected memory could not be loaded/)
})

test('demo memory is explicit, disclosed, and retained through Life Map camera travel', () => {
  assert.match(contract, /params\.get\('demo'\) === '1'/)
  assert.match(contract, /startsWith\('demo:'\)/)
  assert.match(contract, /This is not personal data/)
  assert.match(hook, /params\.get\('from'\) !== 'life-map-camera'/)
  assert.match(hook, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.match(hook, /urai:lifeMapDemoMode/)
  assert.match(hook, /`demo:\$\{memoryId\}`/)
  assert.match(hook, /requestedDemoMemoryId/)
  assert.match(focus, /DEMO FIXTURE · NOT PERSONAL DATA/)
  assert.match(replay, /DEMO FIXTURE · NOT PERSONAL DATA/)
})

test('privacy-safe denied, deleted, unavailable, and corrupt states exist', () => {
  for (const state of ['unavailable', 'deleted', 'unauthorized', 'corrupt']) assert.match(contract, new RegExp(`'${state}'`))
  assert.match(contract, /ownerId !== expectedOwnerId/)
  assert.match(contract, /raw\.deleted === true/)
  assert.match(contract, /replay manifest is incomplete/i)
})

test('Focus and Replay share exact selected memory and manifest identity', () => {
  assert.match(focus, /useSelectedMemory/)
  assert.match(replay, /useSelectedMemory/)
  assert.match(focus, /data-star-id=\{memory\.star\.id\}/)
  assert.match(replay, /data-star-id=\{memory\.star\.id\}/)
  assert.match(focus, /memory\.replayManifest\.id/)
  assert.match(replay, /memory\?\.replayManifest\.segments/)
  assert.doesNotMatch(focus, /quiet-reset|replay-recovery-thread|The pressure became permission/)
  assert.doesNotMatch(replay, /quiet-reset|seed-memory-bloom|Evening Pattern/)
})
