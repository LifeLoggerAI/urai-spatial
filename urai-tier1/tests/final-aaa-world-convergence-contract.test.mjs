import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const worldTypes = read('src/spatial/world/worldTypes.ts')
const registry = read('src/spatial/world/destinationRegistry.ts')
const shell = read('src/spatial/world/UraiWorldShell.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const atmosphere = read('src/spatial/world/PersistentRealmAtmosphere.tsx')
const atmosphereCss = read('src/spatial/world/persistentRealmAtmosphere.css')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
const focusClient = read('src/app/focus/FocusChamberClient.tsx')
const replayClient = read('src/app/replay/CinematicReplayClient.tsx')
const chrome = read('src/spatial/world/persistentWorldCompanion.css')
const lifeMapConvergence = read('src/spatial/world/lifeMapConvergence.css')
const routeOwnerConvergence = read('src/spatial/world/routeOwnerConvergence.css')
const secondaryRealmConvergence = read('src/spatial/world/secondaryRealmConvergence.css')

const canonicalDestinations = [
  'home',
  'infrastructure-hub',
  'life-map',
  'focus',
  'replay',
  'mirror',
  'passport',
  'privacy-controls',
  'location-map',
]

test('the full journey participates in one persistent world model', () => {
  for (const destination of canonicalDestinations) {
    assert.match(worldTypes, new RegExp(`['"]${destination}['"]`))
    assert.match(registry, new RegExp(`['"]${destination}['"]`))
  }
  assert.match(registry, /\[\s*['"]\/life-map['"]\s*,\s*['"]life-map['"]\s*\]/)
  assert.match(registry, /environmentalForm:\s*['"]explorable-memory-constellation['"]/) 
})

test('Orb ownership follows destination canon without visual duplication', () => {
  assert.match(shell, /PersistentWorldCompanion/)
  assert.match(shell, /const showWorldCompanion = world\.destination !== 'life-map' && world\.destination !== 'home'/)
  assert.match(shell, /\{showWorldCompanion \? <PersistentWorldCompanion \/> : null\}/)
  assert.match(companion, /PRIMARY_DESTINATIONS/)
  assert.match(companion, /SECONDARY_DESTINATIONS/)
  for (const destination of canonicalDestinations) {
    assert.match(companion, new RegExp(`['"]${destination}['"]`))
  }
  assert.match(companion, /requestUraiWorldTravel/)
  assert.match(companion, /requestUraiWorldReturn/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /aria-label=\{open \? 'Close Orb travel controls' : 'Open Orb travel controls'\}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.doesNotMatch(companion, /next\/link/)
  assert.match(worldEvents, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /onOrbOpen=\{requestUraiWorldOrbOpen\}/)
  assert.match(homeCanvas, /name="home-only-companion-hit-target"/)
  assert.match(homeCanvas, /colorWrite=\{false\}/)
  assert.doesNotMatch(homeCanvas, /emissiveIntensity=\{hovered|name="home-only-companion"/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-orb-trigger/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-runtime-orb/)
})

test('one environmental continuity layer persists across every route transition', () => {
  assert.match(shell, /PersistentRealmAtmosphere/)
  assert.match(shell, /<PersistentRealmAtmosphere\s*\/>/)
  assert.match(shell, /import '\.\/persistentRealmAtmosphere\.css'/)
  assert.match(atmosphere, /data-realm=\{world\.destination\}/)
  assert.match(atmosphere, /data-phase=\{phase\}/)
  assert.match(atmosphere, /urai-world-atmosphere__horizon/)
  assert.match(atmosphere, /urai-world-atmosphere__threshold/)
  for (const destination of ['infrastructure-hub', 'life-map', 'focus', 'replay', 'mirror', 'passport', 'privacy-controls', 'location-map']) {
    assert.match(atmosphereCss, new RegExp(`data-realm=['"]${destination}['"]`))
  }
  assert.match(atmosphereCss, /pointer-events:\s*none/)
  assert.match(atmosphereCss, /data-phase/)
  assert.match(atmosphereCss, /env\(safe-area-inset-bottom\)/)
  assert.match(atmosphereCss, /prefers-reduced-motion: reduce/)
})

test('page-like route chrome is removed from the active world', () => {
  for (const selector of ['.ground-card', '.ground-rail', '.focusTitle', '.focusNav']) {
    assert.match(chrome, new RegExp(selector.replace('.', '\\.')))
  }
  assert.match(chrome, /\[aria-label='URAI Life Map route portals'\]/)
  assert.match(chrome, /\[aria-label='Replay location'\]/)
  assert.match(chrome, /display:\s*none\s*!important/)
})

test('Life Map reads as a full-viewport world instead of a landing page', () => {
  assert.match(shell, /import '\.\/lifeMapConvergence\.css'/)
  assert.match(lifeMapConvergence, /data-world-destination='life-map'/)
  assert.match(lifeMapConvergence, /data-testid='urai-true-3d-life-map'/)
  assert.match(lifeMapConvergence, /> header[\s\S]*display:\s*none\s*!important/)
  assert.match(lifeMapConvergence, /aria-label='URAI Life Map route portals'/)
  assert.match(lifeMapConvergence, /height:\s*100svh/)
  assert.match(lifeMapConvergence, /env\(safe-area-inset-bottom\)/)
  assert.match(lifeMapConvergence, /@media \(max-width: 430px\)/)
})

test('canonical route clients own Focus and Replay without the legacy autonomous overlay', () => {
  assert.match(shell, /import '\.\/routeOwnerConvergence\.css'/)
  assert.match(focusClient, /data-testid="urai-final-focus-chamber"/)
  assert.match(focusClient, /useSelectedMemory\(\)/)
  assert.match(focusClient, /requestUraiWorldTravel/)
  assert.match(focusClient, /requestUraiWorldReturn/)
  assert.doesNotMatch(focusClient, /uraiAutoFocus|quiet-reset|replay-recovery-thread/)
  assert.match(replayClient, /data-testid="cinematic-replay-client"/)
  assert.match(replayClient, /useSelectedMemory\(\)/)
  assert.match(replayClient, /requestUraiWorldReturn/)
  assert.doesNotMatch(replayClient, /uraiAutoReplay|quiet-reset|replay-recovery-thread|seed-memory-bloom/)
  assert.doesNotMatch(routeOwnerConvergence, /\.uraiAutoFocus|\.uraiAutoReplay/)
  assert.match(routeOwnerConvergence, /data-world-destination='replay'/)
})

test('secondary realms remain full-viewport destinations owned by the shared Orb', () => {
  assert.match(shell, /import '\.\/secondaryRealmConvergence\.css'/)
  for (const destination of ['mirror', 'passport', 'privacy-controls', 'location-map']) {
    assert.match(secondaryRealmConvergence, new RegExp(`data-world-destination=['"]${destination}['"]`))
  }
  assert.match(secondaryRealmConvergence, /URAI launch route chain/)
  assert.match(secondaryRealmConvergence, /URAI passport route chain/)
  assert.match(secondaryRealmConvergence, /URAI privacy route chain/)
  assert.match(secondaryRealmConvergence, /display:\s*none\s*!important/)
  assert.match(secondaryRealmConvergence, /height:\s*100svh/)
  assert.match(secondaryRealmConvergence, /env\(safe-area-inset-bottom\)/)
  assert.match(secondaryRealmConvergence, /@media \(max-width: 430px\)/)
  assert.match(secondaryRealmConvergence, /prefers-reduced-motion: reduce/)
})

test('mobile safe area, scroll containment, and reduced motion remain explicit', () => {
  assert.match(chrome, /env\(safe-area-inset-bottom\)/)
  assert.match(chrome, /max-height:\s*min\(68svh, 520px\)/)
  assert.match(chrome, /overflow-y:\s*auto/)
  assert.match(chrome, /@media \(max-width: 560px\)/)
  assert.match(chrome, /prefers-reduced-motion: reduce/)
  assert.match(lifeMapConvergence, /prefers-reduced-motion: reduce/)
})
