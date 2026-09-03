import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
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
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeProductionEntry}\n${homeProduction}\n${homeArt}\n${finalHome}`
const groundGraph = `${ground}\n${groundModel}`

const has = (source, marker) => assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

test('shared movement kernel owns stable input, calm motion, boundaries and collision', () => {
  for (const marker of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'stepEmbodiedMotion', 'THREE.MathUtils.damp', 'MovementBounds', 'MovementObstacle', 'MobileMovementPad', 'MovementHelp', 'arrivalRadius', 'MOTION_REQUESTED', 'MOTION_FORWARD', 'MOTION_RIGHT', 'MOTION_NEXT']) has(kernel, marker)
  assert.match(kernel, /addEventListener\('keydown', onKeyDown, \{ passive: false, capture: true \}\)/)
  assert.match(kernel, /next\.x = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /next\.z = THREE\.MathUtils\.clamp/)
  assert.doesNotMatch(kernel, /requestPointerLock|pointerlockchange|movementX|movementY|sprint|jump|crouch/i)
})

test('Home is the live single-Canvas V76 relic sanctuary with governed identities fail-closed', () => {
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
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld|data-home-ground-portal=|data-home-life-map-portal=/)

  has(assetHome, 'HomeWorldProduction')
  assert.match(assetHome, /<HomeWorldProduction onOrbOpen=\{onOrbOpen\} webglAvailable=\{webglAvailable\} \/>/)
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionV70 as HomeWorldProduction \} from "\.\/HomeWorldProductionV70"/)

  for (const marker of [
    'HomeWorldProductionV70',
    "const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'",
    "const GOVERNED_PORTAL = '/assets/urai/generated/models/portal-ring-master-v1.glb'",
    "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
    "const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'",
    "const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'",
    "const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'",
    "const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'",
    'data-home-primary-owner="asset-driven"',
    'data-home-visible-world="v76-deep-apse-relic-machine-sanctuary"',
    'data-home-world-character="production-cinematic-sacred-tech"',
    'data-home-physical-base="continuous-pbr-rock-industrial-machine-sanctuary"',
    'data-home-visual-ownership="single-canvas-three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-first-person"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-visual-grade="cinematic-pbr-v93-governed-dimensional-sanctuary"',
    'data-home-final-art-revision="v93-dimensional-governed-rebuild"',
    'data-home-art-certification="v76-retained-pixel-candidate-not-certified"',
    'data-home-animation-owner="v93-dimensional-governed-sanctuary"',
    'data-home-governed-identity-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb"',
    'data-home-visible-production-assets="governed-threshold-architecture rock_face_01 rock_face_02 rock-face-pbr"',
    'data-testid="home-visible-navigable-sanctuary-world"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
    'home-authored-terrain',
    'home-mountain-horizon',
    'home-living-vegetation',
    'home-v76-apse-embedded-orb-relic-machine',
    'home-authored-embodied-self',
    'home-ground-environmental-threshold',
    'home-life-map-sky-lookout',
    'home-life-map-physical-portal',
    'home-sanctuary-pavilion',
    'home-v76-continuous-hand-cut-vault',
    'home-v76-port-canted-bearing-wall',
    'home-v76-port-integrated-service-manifold',
    'v93-dimensional-governed-sanctuary',
    'stepEmbodiedMotion',
    'useMovementInput',
    'useDragLook',
    'MobileMovementPad',
    'requestUraiWorldTravel',
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    '<Canvas',
  ]) has(homeGraph, marker)
  assert.match(homeProduction, /function Sanctuary\(/)
  assert.match(homeProduction, /<HomeV76Sanctuary/)
  assert.match(homeArt, /function RelicMachine\(/)
  assert.match(homeArt, /function PortalRecess\(/)
  assert.doesNotMatch(homeArt, /function StoneMass\(|function Beam\(|octahedronGeometry|icosahedronGeometry|capsuleGeometry/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /destination: 'infrastructure-hub'/)
  assert.match(homeProduction, /destination: 'life-map'/)
  assert.match(homeProduction, /yaw: yaw\\.current/)
  assert.match(homeProduction, /dpr=\{1\}/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_HOME\)/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_PORTAL\)/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_ORB\)/)
  assert.doesNotMatch(homeArt, /<GovernedModel|RoundedBox|icosahedronGeometry|#37e5ff|#48dfff|#6cf4ff/i)
  assert.doesNotMatch(homeProduction, /requestPointerLock|sprint|jump|crouch/i)
  assert.doesNotMatch(assetHome, /HomeV75RetainedPixelWorld|HomeWorldProductionV75/)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.equal((homeProduction.match(/<Canvas/g) ?? []).length, 1)

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

test('Home telemetry uses the same spawn and destination coordinates as the live scanned-industrial world', () => {
  assert.match(assetHome, /const HOME_SPAWN = \{ x: 0, z: 4\.6 \} as const/)
  assert.match(assetHome, /const HOME_ORB = \{ x: -0\.28, z: -6\.18 \} as const/)
  assert.match(assetHome, /const HOME_GROUND = \{ x: -4\.85, z: -8\.25 \} as const/)
  assert.match(assetHome, /const HOME_LIFE_MAP = \{ x: 4\.85, z: -8\.25 \} as const/)
  assert.match(homeProduction, /const SPAWN = new THREE\.Vector3\(0, 0\.04, 4\.6\)/)
  assert.match(homeProduction, /const ORB = new THREE\.Vector3\(-0\.28, 2\.48, -6\.18\)/)
  assert.match(homeProduction, /const GROUND = new THREE\.Vector3\(-4\.85, 0, -8\.25\)/)
  assert.match(homeProduction, /const LIFE_MAP = new THREE\.Vector3\(4\.85, 0, -8\.25\)/)
  assert.doesNotMatch(assetHome, /HOME_SPAWN = \{ x: 4\.45, z: 3\.15 \}/)
  assert.doesNotMatch(homeProduction, /const SPAWN = new THREE\.Vector3\(4\.45, 0\.04, 3\.15\)/)
})

test('Home keeps one physical stateful relic-machine Orb owner and semantic access parity', () => {
  assert.match(homeProduction, /const ORB = new THREE\.Vector3\(/)
  has(homeArt, 'name="home-v76-apse-embedded-orb-relic-machine"')
  has(homeProduction, 'data-testid="urai-home-webgl-orb"')
  assert.match(homeProduction, /<HomeV76Sanctuary reducedMotion=\{reducedMotion\} orbState=\{orbState\}/)
  assert.match(homeProduction, /window\.addEventListener\(URAI_ORB_STATE_EVENT, listener\)/)
  assert.match(homeArt, /onClick=\{\(event: ThreeEvent<MouseEvent>\) => \{ event\.stopPropagation\(\); onOpen\(\) \}\}/)
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
  for (const marker of ['KeyA', 'ArrowLeft', 'KeyQ', 'ArrowRight', 'KeyD', 'KeyE', 'cycle(-1)', 'cycle(1)', 'urai:life-map-overview', 'life-map-movement-help']) has(lifeMapBoundary, marker)
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
