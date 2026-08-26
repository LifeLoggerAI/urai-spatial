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
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionFinal.tsx')
const focusClient = read('src/app/focus/FocusChamberClient.tsx')
const replayClient = read('src/app/replay/CinematicReplayClient.tsx')
const chrome = read('src/spatial/world/persistentWorldCompanion.css')
const lifeMapConvergence = read('src/spatial/world/lifeMapConvergence.css')
const lifeMapSelectedCinematic = read('src/spatial/world/lifeMapSelectedCinematic.css')
const adaptiveLifeMap = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const routeOwnerConvergence = read('src/spatial/world/routeOwnerConvergence.css')
const secondaryRealmConvergence = read('src/spatial/world/secondaryRealmConvergence.css')

const canonicalDestinations = ['home', 'infrastructure-hub', 'life-map', 'focus', 'replay', 'mirror', 'passport', 'privacy-controls', 'location-map']

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
  assert.match(shell, /const showWorldCompanion = world\.destination !== 'life-map'/)
  assert.match(shell, /\{showWorldCompanion \? <PersistentWorldCompanion \/> : null\}/)
  assert.match(companion, /PRIMARY_DESTINATIONS/)
  assert.match(companion, /SECONDARY_DESTINATIONS/)
  for (const destination of canonicalDestinations) assert.match(companion, new RegExp(`['"]${destination}['"]`))
  assert.match(companion, /requestUraiWorldTravel/)
  assert.match(companion, /requestUraiWorldReturn/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /aria-label=\{open \? 'Close Orb travel controls' : 'Open Orb travel controls'\}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.doesNotMatch(companion, /next\/link/)
  assert.match(worldEvents, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /onOrbOpen=\{requestUraiWorldOrbOpen\}/)
  assert.match(homeRuntime, /AssetDrivenHomeWorld/)
  assert.match(homeRuntime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld|data-home-visual-owner="final-coherent-sanctuary"/)
  assert.match(assetHome, /HomeWorldProduction/)
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionFinal as HomeWorldProduction \} from "\.\/HomeWorldProductionFinal"/)
  assert.match(homeProduction, /name="home-orb-sanctuary"/)
  assert.match(homeProduction, /data-testid="urai-home-webgl-orb"/)
  assert.match(homeProduction, /<SacredOrb state=\{props\.orbState\} reducedMotion=\{props\.reducedMotion\} onOpen=\{props\.onOrb\} \/>/)
  assert.match(homeProduction, /resolveOrbSensoryOutput\(state,reducedMotion,true\)/)
  assert.match(homeProduction, /window\.addEventListener\(URAI_ORB_STATE_EVENT,listener\)/)
  assert.match(homeProduction, /data-home-orb-state=\{orbState\}/)
  assert.match(homeProduction, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState,reducedMotion,true\)\.animation\}/)
  assert.match(homeProduction, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onOpen\(\) \}\}/)
  assert.match(homeProduction, /const ORB_MODEL = '\/assets\/urai\/generated\/models\/urai-orb-avatar-v1\.glb'/)
  assert.match(homeProduction, /const PORTAL_MODEL = '\/assets\/urai\/generated\/models\/portal-ring-master-v1\.glb'/)
  assert.match(homeProduction, /name="home-life-map-physical-portal"/)
  assert.doesNotMatch(homeProduction, /name="home-only-companion"/)
  assert.match(routeOwnerConvergence, /data-world-destination='home'[\s\S]*\.urai-world-companion__orb/)
  assert.match(routeOwnerConvergence, /background:\s*transparent\s*!important/)
  assert.match(routeOwnerConvergence, /box-shadow:\s*none\s*!important/)
  assert.match(routeOwnerConvergence, /outline:\s*3px solid rgba\(224,255,255,.96\)\s*!important/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-orb-trigger|urai-home-spatial-runtime-orb/)
})

test('one environmental continuity layer persists across every route transition', () => {
  assert.match(shell, /PersistentRealmAtmosphere/)
  assert.match(shell, /<PersistentRealmAtmosphere\s*\/>/)
  assert.match(shell, /import '\.\/persistentRealmAtmosphere\.css'/)
  assert.match(atmosphere, /data-realm=\{world\.destination\}/)
  assert.match(atmosphere, /data-phase=\{phase\}/)
  assert.match(atmosphere, /urai-world-atmosphere__horizon/)
  assert.match(atmosphere, /urai-world-atmosphere__threshold/)
  for (const destination of ['infrastructure-hub', 'life-map', 'focus', 'replay', 'mirror', 'passport', 'privacy-controls', 'location-map']) assert.match(atmosphereCss, new RegExp(`data-realm=['"]${destination}['"]`))
  assert.match(atmosphereCss, /pointer-events:\s*none/)
  assert.match(atmosphereCss, /data-phase/)
  assert.match(atmosphereCss, /env\(safe-area-inset-bottom\)/)
  assert.match(atmosphereCss, /prefers-reduced-motion: reduce/)
})

test('page-like route chrome is removed from the active world', () => {
  for (const selector of ['.ground-card', '.ground-rail', '.focusTitle', '.focusNav']) assert.match(chrome, new RegExp(selector.replace('.', '\\.')))
  assert.match(chrome, /\[aria-label='URAI Life Map route portals'\]/)
  assert.match(chrome, /\[aria-label='Replay location'\]/)
  assert.match(chrome, /display:\s*none\s*!important/)
})

test('Life Map reads as a full-viewport canonical spatial world', () => {
  assert.match(shell, /import '\.\/lifeMapConvergence\.css'/)
  assert.match(lifeMapConvergence, /data-world-destination='life-map'/)
  assert.match(adaptiveLifeMap, /data-testid="urai-true-3d-life-map"/)
  assert.match(adaptiveLifeMap, /<Canvas camera=\{\{ position: OVERVIEW_POSITION, fov: 44, near: \.08, far: 120 \}\}/)
  assert.match(adaptiveLifeMap, /className="life-map-root"/)
  assert.match(adaptiveLifeMap, /position:fixed;inset:0;overflow:hidden/)
  assert.match(adaptiveLifeMap, /type JourneyPhase = "overview" \| "departure" \| "travel" \| "approach" \| "arrival"/)
  assert.match(adaptiveLifeMap, /data-life-map-phase=\{phase\}/)
  assert.match(adaptiveLifeMap, /data-life-map-mode=\{selected \? "selected" : "overview"\}/)
  assert.match(adaptiveLifeMap, /data-home-companion-owned="false"/)
  assert.match(adaptiveLifeMap, /<header className="life-map-title">/)
  assert.match(adaptiveLifeMap, /<h1 className="sr-only">URAI Life Map private universe<\/h1>/)
  assert.match(adaptiveLifeMap, /<details className="life-map-help">/)
  assert.match(adaptiveLifeMap, /if \(selectedId\) overview\(\); else router\.push\("\/home"\)/)
  assert.match(adaptiveLifeMap, /<button type="button" onClick=\{overview\}>Overview<\/button>/)
  assert.match(adaptiveLifeMap, /<button onClick=\{\(\) => router\.push\("\/home"\)\}>Return Home<\/button>/)
  assert.match(adaptiveLifeMap, /env\(safe-area-inset-bottom\)/)
  assert.match(adaptiveLifeMap, /@media\(max-width:700px\)/)
  assert.match(adaptiveLifeMap, /@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(adaptiveLifeMap, /requestPointerLock|PersistentWorldCompanion/)
})

test('canonical route clients own Focus and Replay', () => {
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
  for (const destination of ['mirror', 'passport', 'privacy-controls', 'location-map']) assert.match(secondaryRealmConvergence, new RegExp(`data-world-destination=['"]${destination}['"]`))
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

test('Life Map renders luminous spatial lenses with dominant selected mode and recovery', () => {
  for (const pattern of [
    /function MemoryLens/,
    /name=\{`life-map-memory-\$\{node\.id\}`\}/,
    /data-depth-anchor="true"/,
    /sphereGeometry args=\{\[\.42 \+ node\.intensity \* \.16, 32, 32\]\}/,
    /meshPhysicalMaterial color=\{color\} emissive=\{color\}/,
    /emissiveIntensity=\{active \? 1\.5 : \.55\}/,
    /const scale = active \? 1\.7 : muted \? \.72 : 1/,
    /name="life-map-anchored-paths"/,
    /activeId=\{selected\?\.id \|\| null\}/,
    /name="life-map-depth-near"/,
    /name="life-map-depth-middle"/,
    /name="life-map-depth-far"/,
    /setPhase\("departure"\)/,
    /setPhase\("travel"\)/,
    /setPhase\("approach"\)/,
    /setPhase\("arrival"\)/,
    /<nav className="life-map-actions" aria-label="Selected memory actions">/,
    />Enter Focus<\/button>/,
    />Replay<\/button>/,
    />Overview<\/button>/,
    /data-webgl-state=\{webglState\}/,
    /webglcontextlost/,
    /webglcontextrestored/,
    /Your selected memory and privacy state remain preserved\./,
    /Open semantic overview/,
  ]) assert.match(adaptiveLifeMap, pattern)
  assert.match(lifeMapSelectedCinematic, /data-life-map-mode='selected'/)
  assert.match(lifeMapSelectedCinematic, /position: fixed/)
  assert.match(lifeMapSelectedCinematic, /pointer-events: auto !important/)
})
