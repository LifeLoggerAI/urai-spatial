import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionFinal.tsx')
const finalHome = read('src/app/FinalHomeWorld.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const lifeMapBoundary = read('src/spatial/world/LifeMapIndependentInputBoundary.tsx')
const lifeMapScene = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const lifeMapProduction = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const worldShell = read('src/spatial/world/UraiWorldShell.tsx')
const routeOwner = read('src/spatial/world/routeOwnerConvergence.css')
const embodiedLayout = read('src/spatial/world/embodiedExplorationLayout.css')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const worldTransitions = read('src/spatial/world/WorldTransitionController.tsx')
const sceneStore = read('src/spatial/store/useSceneStore.ts')
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeProductionEntry}\n${homeProduction}\n${finalHome}`
const groundGraph = `${ground}\n${groundModel}`

const has = (source, marker) => assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

test('shared movement kernel owns stable input, calm motion, boundaries and collision', () => {
  for (const marker of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'stepEmbodiedMotion', 'THREE.MathUtils.damp', 'MovementBounds', 'MovementObstacle', 'MobileMovementPad', 'MovementHelp', 'arrivalRadius', 'MOTION_REQUESTED', 'MOTION_FORWARD', 'MOTION_RIGHT', 'MOTION_NEXT']) has(kernel, marker)
  assert.match(kernel, /addEventListener\('keydown', onKeyDown, \{ passive: false, capture: true \}\)/)
  assert.match(kernel, /next\.x = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /next\.z = THREE\.MathUtils\.clamp/)
  assert.doesNotMatch(kernel, /requestPointerLock|pointerlockchange|movementX|movementY|sprint|jump|crouch/i)
})

test('Home is the live embodied real-world-first sanctuary with an explicit degraded fallback', () => {
  for (const marker of [
    'AssetDrivenHomeWorld',
    'data-urai-home-runtime="asset-driven-primary-with-procedural-degraded-fallback"',
    'data-home-visual-owner="asset-driven-personalized-sanctuary"',
    'data-home-exploration="walkable"',
    'data-home-ground-affordance="home-ground-environmental-threshold"',
    'data-home-life-map-affordance="home-life-map-sky-lookout"',
    'data-home-context-owner="world-local-context-only"',
    'aria-label="Open URAI Orb companion"',
    'aria-label="Open Ground directly"',
    'aria-label="Open Life Map directly"',
  ]) has(homeRuntime, marker)
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld|data-home-visual-owner="final-coherent-sanctuary"|data-home-ground-portal=|data-home-life-map-portal=/)

  has(assetHome, 'HomeWorldProduction')
  assert.match(assetHome, /<HomeWorldProduction onOrbOpen=\{onOrbOpen\} webglAvailable=\{webglAvailable\} \/>/)
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionFinal as HomeWorldProduction \} from "\.\/HomeWorldProductionFinal"/)

  for (const marker of [
    'data-home-primary-owner="asset-driven"',
    'data-home-real-world-first="true"',
    'data-home-visible-world="authored-coherent-three-dimensional-sanctuary"',
    'data-home-world-character="believable-natural-inhabitable-environment"',
    'data-home-visible-portals="false"',
    'data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout"',
    'data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT}',
    'data-home-provider-role="atmospheric-support-only"',
    'data-home-generated-scenery="suppressed"',
    'data-home-physical-base="authored-coherent-world"',
    'data-home-visual-ownership="three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-shadow"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
    'home-authored-terrain',
    'home-mountain-horizon',
    'home-living-vegetation',
    'home-reflecting-water',
    'home-orb-sanctuary',
    'home-authored-embodied-self',
    'home-ground-environmental-threshold',
    'home-life-map-sky-lookout',
    'stepEmbodiedMotion',
    'useMovementInput',
    'useDragLook',
    'MobileMovementPad',
    'requestUraiWorldTravel',
    '<Canvas',
  ]) has(homeProduction, marker)
  assert.match(homeProduction, /HOME_PROVIDER_ENVIRONMENT = "\/assets\/urai\/replay\/replay-memory-film-main\.webp"/)
  assert.match(homeProduction, /function preparePhysicalTerrain/)
  assert.match(homeProduction, /object\.visible = visible/)
  assert.match(homeProduction, /providerImageRole: "atmospheric-support-only"/)
  assert.match(homeProduction, /ContactShadows/)
  assert.match(homeProduction, /function GroundThresholdLandmark/)
  assert.match(homeProduction, /function LifeMapSkyLookout/)
  assert.doesNotMatch(homeProduction, /WorldPortal|PORTAL_MODEL|home-ground-portal-world-owned|home-life-map-portal-world-owned|dodecahedronGeometry|requestPointerLock|sprint|jump|crouch|latheGeometry|torusKnotGeometry/i)

  for (const marker of [
    'data-home-visible-world="final-physical-sanctuary-memory-rooms"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'data-testid="urai-home-walkable-surface"',
    'data-testid="urai-home-webgl-orb"',
    'home-visible-navigable-sanctuary-world',
  ]) has(finalHome, marker)
  assert.match(homeRuntime, /accessible-fallback-after-renderer-failure/)
  assert.match(homeRuntime, /<HomeSpatialWorldFinal \/>/)
})

test('Home keeps one physical Orb owner and semantic access parity', () => {
  assert.match(homeProduction, /const ORB = new THREE\.Vector3\(/)
  has(homeProduction, 'name="home-orb-sanctuary"')
  has(homeProduction, 'data-testid="urai-home-webgl-orb"')
  assert.match(homeProduction, /<HomeReducedMotionContext\.Provider value=\{reducedMotion\}>/)
  assert.match(homeProduction, /<OrbSanctuary onOpen=\{onOrbOpen\} \/>/)
  assert.match(homeProduction, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onOpen\(\); \}\}/)
  assert.match(worldShell, /const showWorldCompanion = world\.destination !== 'life-map'/)
  assert.match(routeOwner, /data-world-destination='home'[\s\S]*\.urai-world-companion__orb/)
  assert.match(routeOwner, /background:\s*transparent\s*!important/)
  assert.match(homeRuntime, />Ground<\/button>/)
  assert.match(homeRuntime, />Life Map<\/button>/)
})

test('Ground remains walkable infrastructure with paths, boundaries and semantic exits', () => {
  for (const marker of [
    'data-ground-exploration="walkable"',
    'data-ground-pointer-lock="false"',
    'aria-label="Ground destinations"',
    'data-testid="urai-ground-private-workforce-world"',
    'data-testid="urai-ground-walkable-surface"',
    'ground-continuity-architectural-shell',
    'ground-walkable-navigation-surface',
    'ground-walkable-path-network',
    'ground-central-nexus',
    'ground-enterable-threshold-',
    'ground-workforce-and-council-presences',
    'data-ground-destination',
    'stepEmbodiedMotion',
    'useMovementInput',
    'useDragLook',
    'MobileMovementPad',
    'const BOUNDS =',
    'obstacles:',
  ]) has(groundGraph, marker)
  assert.match(ground, /onEscape:\s*\(\) => router\.push\("\/home\?returnFrom=ground"\)/)
  assert.match(ground, /onFocus=\{\(event\) => event\.currentTarget\.scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)\}/)
  assert.match(ground, /min-height:48px/)
  assert.match(embodiedLayout, /data-world-destination='infrastructure-hub'[\s\S]*\.urai-movement-help/)
  assert.doesNotMatch(ground, /requestPointerLock|sprint|jump|crouch/i)
})

test('Life Map keeps independent non-Orb travel, semantic depth and overview recovery', () => {
  for (const marker of ['KeyA', 'ArrowLeft', 'KeyQ', 'KeyD', 'ArrowRight', 'KeyE', 'cycle(-1)', 'cycle(1)', 'urai:life-map-overview', 'life-map-movement-help']) has(lifeMapBoundary, marker)
  for (const marker of ['type JourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival"', 'goalForNode', 'CameraRig', 'life-map-depth-near', 'life-map-depth-middle', 'life-map-depth-far', 'setPhase("departure")', 'setPhase("travel")', 'setPhase("approach")', 'setPhase("arrival")', 'data-life-map-phase={phase}', 'data-home-companion-owned="false"']) has(lifeMapScene, marker)
  for (const marker of ['life-map-light-bridges', 'life-map-privacy-vault', 'life-map-emotional-weather', 'life-map-far-future-horizon', 'QuadraticBezierCurve3']) has(lifeMapProduction, marker)
  assert.match(embodiedLayout, /data-world-destination='life-map'[\s\S]*\.life-map-movement-help/)
  assert.doesNotMatch(lifeMapBoundary, /Orb companion|PersistentWorldCompanion|requestPointerLock/)
  assert.doesNotMatch(lifeMapScene, /PersistentWorldCompanion|requestPointerLock/)
})

test('travel infrastructure preserves fallback, route ownership and canonical ascent capability', () => {
  for (const marker of ['URAI_WORLD_TRAVEL_EVENT', 'buildFallbackHref', 'commitHardFallback', 'WORLD_TRAVEL_FALLBACK_MS', 'markHomeAscentClosing']) has(worldEvents, marker)
  for (const marker of ['beginTravelRef.current(request)', 'transitionDuration(request.destination)', 'router.push(href)', 'navigationWatchdog']) has(worldTransitions, marker)
  for (const marker of ['enterLifeMap: () => set({ mode: "ASCENT"', 'phase: "ASCENT"', 'isTransitioning: true', 'inputLocked: true', 'progress: 0']) has(sceneStore, marker)
  assert.match(worldTransitions, /currentWorld\.destination === 'life-map' \|\| currentWorld\.destination === 'location-map'/)
})

test('embodied movement never removes semantic Focus and Replay exits', () => {
  assert.match(lifeMapScene, />Enter Focus<\/button>/)
  assert.match(lifeMapScene, />Replay<\/button>/)
})
