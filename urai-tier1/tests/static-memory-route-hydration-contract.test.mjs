import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const focusPage = readFileSync(new URL('../src/app/focus/page.tsx', import.meta.url), 'utf8')
const focusClient = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const replayPage = readFileSync(new URL('../src/app/replay/page.tsx', import.meta.url), 'utf8')
const replayClient = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const lifeMoviePage = readFileSync(new URL('../src/app/life-movie/page.tsx', import.meta.url), 'utf8')
const lifeMovieClient = readFileSync(new URL('../src/app/life-movie/LifeMovieClient.tsx', import.meta.url), 'utf8')
const visibleLayer = readFileSync(new URL('../src/app/UraiAutonomousV1Layer.tsx', import.meta.url), 'utf8')
const selectedMemoryHook = readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
const locationHook = readFileSync(new URL('../src/hooks/useBrowserLocation.ts', import.meta.url), 'utf8')
const locationStore = readFileSync(new URL('../src/lib/browserLocationStore.ts', import.meta.url), 'utf8')
const smoke = readFileSync(new URL('../../scripts/urai-release-control-smoke.mjs', import.meta.url), 'utf8')

// Static export must expose the real surfaces before client-side query hydration begins.
test('focus and replay render real static surfaces instead of Suspense loading shells', () => {
  assert.doesNotMatch(focusPage, /Suspense|Focus loading/)
  assert.match(focusPage, /return <FinalFocusChamber \/>/)
  assert.doesNotMatch(replayPage, /Suspense|Replay loading/)
  assert.match(replayPage, /<FinalReplayFilm \/>/)
})

test('memory routes hydrate exact query identity without useSearchParams', () => {
  for (const source of [focusClient, replayClient]) {
    assert.doesNotMatch(source, /useSearchParams/)
    assert.match(source, /useSelectedMemory\(\)/)
    assert.match(source, /useBrowserLocation\(\)/)
  }
  assert.match(selectedMemoryHook, /const memoryId = sanitizeMemoryId/)
  assert.match(selectedMemoryHook, /const manifestId = sanitizeMemoryId/)
  assert.match(selectedMemoryHook, /const selectionKey = JSON\.stringify/)
  assert.match(selectedMemoryHook, /return selection\.key === selectionKey \? selection\.result : LOADING/)
  assert.match(selectedMemoryHook, /onAuthStateChanged\(auth/)
  assert.match(selectedMemoryHook, /isConsentPolicy\(raw, user\.uid\)/)
  assert.match(selectedMemoryHook, /parsed\.memory\.replayManifest\.id !== manifestId/)
})

test('Life Movie hydrates memory and movie identity without useSearchParams', () => {
  assert.doesNotMatch(lifeMoviePage, /Suspense|Life Movie loading/)
  assert.match(lifeMoviePage, /return <LifeMovieClient \/>/)
  assert.doesNotMatch(lifeMovieClient, /useSearchParams/)
  assert.match(lifeMovieClient, /new URLSearchParams\(window\.location\.search\)/)
  assert.match(lifeMovieClient, /memoryId: sanitizeMemoryId\(params\.get\('memoryId'\)\)/)
  assert.match(lifeMovieClient, /movieId: sanitizeMemoryId\(params\.get\('movieId'\)\)/)
  assert.match(lifeMovieClient, /setIdentityReady\(true\)/)
  assert.match(lifeMovieClient, /window\.addEventListener\('popstate', hydrateIdentity\)/)
  assert.match(lifeMovieClient, /window\.removeEventListener\('popstate', hydrateIdentity\)/)
})

test('visible Focus owner hydrates and exposes the same exact query identity', () => {
  assert.match(focusPage, /return <FinalFocusChamber/)
  assert.match(focusClient, /data-testid="urai-final-focus-chamber"/)
  assert.match(focusClient, /data-memory-id=\{memory\?\.id\}/)
  assert.match(focusClient, /data-manifest-id=\{memory\?\.replayManifest\.id\}/)
  assert.match(focusClient, /data-node=\{memory\?\.star\.id\}/)
  assert.match(focusClient, /memory && !memory\.demo && memory\.privacy === 'private' && memory\.authorization === 'owner'/)
  assert.doesNotMatch(visibleLayer, /pathname\.startsWith\("\/focus"\)/)
})

test('visible Focus identity refreshes on same-path history navigation', () => {
  assert.match(locationHook, /useSyncExternalStore\(subscribeBrowserLocation/)
  assert.match(locationStore, /history\.pushState = pushState/)
  assert.match(locationStore, /history\.replaceState = replaceState/)
  assert.match(locationStore, /window\.addEventListener\('popstate', notify\)/)
  assert.match(locationStore, /void Promise\.resolve\(\)\.then\(notify\)/)
  assert.match(selectedMemoryHook, /return selection\.key === selectionKey \? selection\.result : LOADING/)
})

test('visible Focus navigation preserves memory, manifest, and node identity', () => {
  assert.match(focusClient, /new URLSearchParams\(\{ memoryId: memory\.id, manifestId: memory\.replayManifest\.id, node: returnNode/)
  assert.match(focusClient, /forwardPrivateMovieRouteSelection\(next, incoming/)
  assert.match(focusClient, /requestUraiWorldTravel\(\{ destination: 'replay', href: replayHref/)
  assert.match(replayClient, /replaySessionIdentity\(memory, selectedMovie\)/)
  assert.match(replayClient, /authorizedOwner: memory\.authorization === 'owner' && memory\.privacy === 'private'/)
})

test('strict smoke waits for an exact visible hydrated identity', () => {
  assert.match(smoke, /await page\.waitForFunction\(/)
  assert.match(smoke, /element\.getAttribute\('data-memory-id'\) === expected\.memoryId/)
  assert.match(smoke, /element\.getAttribute\('data-manifest-id'\) === expected\.manifestId/)
  assert.match(smoke, /element\.getAttribute\('data-node'\) === expected\.node/)
  assert.match(smoke, /page\.locator\(visibleSelector\)\.first\(\)/)
})
