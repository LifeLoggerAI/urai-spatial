import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const contract = read('src/spatial/memory/selectedMemoryContract.ts')
const hook = read('src/spatial/memory/useSelectedMemory.ts')
const demoMemory = read('src/spatial/memory/explicitDemoMemory.ts')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const focusStyles = read('src/app/focus/FocusChamber.module.css')
const cinematicStyles = read('src/app/focus/FocusChamberCinematic.module.css')
const replay = read('src/app/replay/CinematicReplayClient.tsx')


test('production memory loading never silently substitutes demo or seed content', () => {
  assert.doesNotMatch(hook, /lifeMapNodes|seed-memory-bloom|Evening Pattern/)
  assert.match(hook, /firebasePublicEnvReady/)
  assert.match(hook, /Sign in through URAI/)
  assert.match(hook, /private memory could not be opened safely/)
  assert.match(hook, /explicitDemoModeEnabled\(\) && isKnownExplicitDemoMemoryId/)
})

test('demo memory is explicit, bounded to known identities, and visibly disclosed', () => {
  assert.match(contract, /params\.get\('demo'\) === '1'/)
  assert.match(contract, /startsWith\('demo:'\)/)
  assert.match(contract, /This is not personal data/)
  assert.match(demoMemory, /isKnownExplicitDemoMemoryId/)
  assert.match(demoMemory, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.match(demoMemory, /urai:lifeMapDemoMode/)
  assert.match(focus, /Disclosed demonstration · not personal data/)
  assert.match(replay, /DEMO FIXTURE · NOT PERSONAL DATA/)
})

test('privacy-safe denied, deleted, unavailable, and corrupt states exist', () => {
  for (const state of ['unavailable', 'deleted', 'unauthorized', 'corrupt']) assert.match(contract, new RegExp(`'${state}'`))
  assert.match(contract, /ownerId !== expectedOwnerId/)
  assert.match(contract, /raw\.deleted === true/)
  assert.match(contract, /replay manifest is incomplete/i)
  assert.match(focus, /Private boundary held/)
  assert.match(focus, /Memory released/)
  assert.match(focus, /Path protected/)
  assert.match(focus, /No substitute personal memory was created, exposed, or inferred/)
  assert.doesNotMatch(focus, />Memory unavailable</)
})

test('Focus and Replay share exact selected memory and manifest identity', () => {
  assert.match(focus, /useSelectedMemory/)
  assert.match(replay, /useSelectedMemory/)
  assert.match(focus, /data-star-id=\{memory\.star\.id\}/)
  assert.match(replay, /data-star-id=\{memory\.star\.id\}/)
  assert.match(focus, /memory\.replayManifest\.id/)
  assert.match(replay, /memory\?\.replayManifest\.segments/)
  assert.match(focus, /memoryId: memory\.id/)
  assert.match(focus, /manifestId: memory\.replayManifest\.id/)
  assert.doesNotMatch(replay, /quiet-reset|seed-memory-bloom|Evening Pattern/)
})

test('Focus owns a chamber, not the Home Orb, and remains usable without WebGL', () => {
  assert.match(focus, /data-orb-owner="none"/)
  assert.match(focus, /Return to Life Map/)
  assert.match(focus, /Enter Replay/)
  assert.match(focus, /Atmospheric representation/)
  assert.match(focusStyles, /prefers-reduced-motion/)
  assert.match(focusStyles, /forced-colors/)
  assert.match(focusStyles, /max-width: 700px/)
  assert.match(focusStyles, /orientation: landscape/)
  assert.doesNotMatch(focus, /Canvas|WebGLRenderer|three/)
})

test('Focus visual hierarchy keeps the memory dominant and reveals metadata progressively', () => {
  assert.match(focus, /<details className=\{styles\.meaning\}>/)
  assert.match(focus, /<summary>/)
  assert.match(focus, /Memory details/)
  assert.match(focus, /cinematicStyles\.cinematic/)
  assert.match(focus, /cinematicStyles\.recoveryCinematic/)
  assert.match(cinematicStyles, /button\[aria-describedby='focus-replay-description'\][\s\S]*aspect-ratio: 1;/)
  assert.match(cinematicStyles, /figure[\s\S]*aspect-ratio: \.88;/)
  assert.match(cinematicStyles, /details summary[\s\S]*min-height: 48px;/)
  assert.match(cinematicStyles, /recoveryCinematic section\[role\][\s\S]*background: transparent;/)
  assert.match(cinematicStyles, /orientation: landscape/)
  assert.match(cinematicStyles, /max-width: 700px/)
})
