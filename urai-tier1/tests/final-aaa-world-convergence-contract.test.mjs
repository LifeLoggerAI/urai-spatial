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
const lifeMapScene = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
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

test('the Home companion is destination-owned and is not mounted in Life Map', () => {
  assert.match(shell, /const showWorldCompanion = world\.destination !== 'life-map'/)
  assert.match(shell, /data-companion-owned=\{showWorldCompanion \? 'true' : 'false'\}/)
  assert.match(shell, /\{showWorldCompanion \? <PersistentWorldCompanion \/> : null\}/)
  assert.doesNotMatch(shell, /^\s*<PersistentWorldCompanion\s*\/>\s*$/m)

  assert.match(companion, /PRIMARY_DESTINATIONS/)
  assert.match(companion, /SECONDARY_DESTINATIONS/)
  assert.match(companion, /requestUraiWorldTravel/)
  assert.match(companion, /requestUraiWorldReturn/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /aria-label=\{open \? 'Close Orb travel controls' : 'Open Orb travel controls'\}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.doesNotMatch(companion, /next\/link/)
  assert.match(worldEvents, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /onOrbOpen=\{requestUraiWorldOrbOpen\}/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-orb-trigger/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-runtime-orb/)

  assert.match(lifeMapScene, /data-home-companion-owned="false"/)
  assert.match(lifeMapScene, /data-life-map-companion-contract="home-companion-unmounted"/)
  assert.doesNotMatch(lifeMapScene, /Orb companion/)
  assert.doesNotMatch(lifeMapScene, /PersistentWorldCompanion|uiAssets\.orb|orbActive|orbIdle/)
  assert.doesNotMatch(lifeMapConvergence, /\.urai-world-companion/)
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

test('Life Map reads as a full-viewport independent memory universe', () => {
  assert.match(shell, /import '\.\/lifeMapConvergence\.css'/)
  assert.match(lifeMapConvergence, /data-world-destination='life-map'/)
  assert.match(lifeMapConvergence, /\.life-map-independent-realm/)
  assert.match(lifeMapConvergence, /height:\s*100svh/)
  assert.match(lifeMapConvergence, /env\(safe-area-inset-bottom\)/)
  assert.match(lifeMapConvergence, /\.life-map-memory-portals/)
  assert.match(lifeMapConvergence, /\.life-map-accessibility-menu/)
  assert.match(lifeMapConvergence, /@media \(max-width: 430px\)/)
  assert.match(lifeMapConvergence, /prefers-contrast: more/)
  assert.match(lifeMapConvergence, /prefers-reduced-motion: reduce/)

  for (const marker of [
    'life-map-parallax-layer',
    'life-map-near-depth-crossings',
    'life-map-middle-chapter-regions',
    'life-map-far-goal-monuments',
    'life-map-emotional-weather',
    'life-map-private-vaults',
    'life-map-continuity-nexus',
    'createMemorySurface',
    'life-map-memory-artifact',
    'life-map-memory-portals',
    'THREE.MathUtils.smootherstep',
    'lifeMapOrigin',
  ]) {
    assert.match(lifeMapScene, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.doesNotMatch(lifeMapScene, /function LifeCore|<icosahedronGeometry|function NodeGeometry/)
  assert.doesNotMatch(lifeMapScene, /Step inside the map\.<\/h1>\s*<span/)
})

test('Life Map memory surfaces remain profile-scaled and focus-aware', () => {
  assert.match(lifeMapScene, /function createMemorySurface\(node: LifeMapNode, resolution: number\)/)
  assert.match(lifeMapScene, /canvas\.width = resolution/)
  assert.match(lifeMapScene, /canvas\.height = resolution/)
  assert.match(lifeMapScene, /const designScale = resolution \/ 768/)
  assert.match(lifeMapScene, /ctx\.scale\(designScale, designScale\)/)
  assert.match(lifeMapScene, /const textureResolution = selected/)
  assert.match(lifeMapScene, /profile\.tier === "high" \? 512 : 384/)
  assert.match(lifeMapScene, /profile\.tier === "high" \? 128 : 96/)
  assert.match(lifeMapScene, /profile\.tier === "high" \? 224 : 160/)
  assert.match(lifeMapScene, /createMemorySurface\(node, textureResolution\)/)
  assert.match(lifeMapScene, /texture\?\.dispose\(\)/)
  assert.match(lifeMapScene, /texture\.anisotropy = resolution >= 384 \? 4 : 1/)
  assert.doesNotMatch(lifeMapScene, /canvas\.width = 768/)
  assert.doesNotMatch(lifeMapScene, /canvas\.height = 768/)
  assert.doesNotMatch(lifeMapScene, /createMemorySurface\(node\), \[node\]/)
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

test('secondary realms remain full-viewport destinations owned by the shared companion where canon permits', () => {
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
  assert.match(lifeMapConvergence, /max-height:\s*min\(68svh, 520px\)/)
  assert.match(lifeMapConvergence, /overflow-y:\s*auto/)
  assert.match(lifeMapConvergence, /prefers-reduced-motion: reduce/)
})
