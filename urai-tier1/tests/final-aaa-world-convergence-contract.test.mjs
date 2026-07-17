import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const worldTypes = read('src/spatial/world/worldTypes.ts')
const registry = read('src/spatial/world/destinationRegistry.ts')
const shell = read('src/spatial/world/UraiWorldShell.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const chrome = read('src/spatial/world/persistentWorldCompanion.css')
const lifeMapConvergence = read('src/spatial/world/lifeMapConvergence.css')
const routeOwnerConvergence = read('src/spatial/world/routeOwnerConvergence.css')

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

test('one persistent Orb owns all canonical travel and Home opens that same companion', () => {
  assert.match(shell, /PersistentWorldCompanion/)
  assert.match(shell, /<PersistentWorldCompanion\s*\/>/)
  assert.match(companion, /PRIMARY_DESTINATIONS/)
  assert.match(companion, /SECONDARY_DESTINATIONS/)
  for (const destination of canonicalDestinations) {
    assert.match(companion, new RegExp(`['"]${destination}['"]`))
  }
  assert.match(companion, /requestUraiWorldTravel/)
  assert.match(companion, /requestUraiWorldReturn/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /aria-label={open \? 'Close Orb travel controls' : 'Open Orb travel controls'}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.doesNotMatch(companion, /next\/link/)
  assert.match(worldEvents, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /onOrbOpen={requestUraiWorldOrbOpen}/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-orb-trigger/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-runtime-orb/)
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
  assert.match(routeOwnerConvergence, /data-world-destination='focus'/)
  assert.match(routeOwnerConvergence, /\.uraiAutoFocus/)
  assert.match(routeOwnerConvergence, /data-world-destination='replay'/)
  assert.match(routeOwnerConvergence, /\.uraiAutoReplay/)
  assert.match(routeOwnerConvergence, /display:\s*none\s*!important/)
})

test('mobile safe area, scroll containment, and reduced motion remain explicit', () => {
  assert.match(chrome, /env\(safe-area-inset-bottom\)/)
  assert.match(chrome, /max-height:\s*min\(68svh, 520px\)/)
  assert.match(chrome, /overflow-y:\s*auto/)
  assert.match(chrome, /@media \(max-width: 560px\)/)
  assert.match(chrome, /prefers-reduced-motion: reduce/)
  assert.match(lifeMapConvergence, /prefers-reduced-motion: reduce/)
})