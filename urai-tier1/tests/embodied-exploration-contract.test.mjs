import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeRuntime3d = read('src/spatial/layout/HomeWorldProductionV70.tsx')
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
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeEntry}\n${homeRuntime3d}\n${homeArt}\n${finalHome}`
const groundGraph = `${ground}\n${groundModel}`

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('shared movement kernel preserves stable embodied controls and bounded motion', () => {
  for (const marker of ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','stepEmbodiedMotion','THREE.MathUtils.damp','MovementBounds','MovementObstacle','MobileMovementPad','arrivalRadius']) has(kernel, marker)
  assert.match(kernel, /addEventListener\('keydown', onKeyDown, \{ passive: false, capture: true \}\)/)
  assert.match(kernel, /next\.x = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /next\.z = THREE\.MathUtils\.clamp/)
  assert.doesNotMatch(kernel, /requestPointerLock|pointerlockchange|sprint|jump|crouch/i)
})

test('Home keeps one V70 Canvas owner while V126 owns the visible sanctuary art', () => {
  has(homeEntry, 'HomeWorldProductionV70 as HomeWorldProduction')
  has(assetHome, 'data-home-canvas-owner="home-world-production-v70-single-authority"')
  has(assetHome, 'data-home-v125-retained-pixel-rebuild="active"')
  has(assetHome, 'data-home-v126-retained-pixel-rebuild="active"')
  has(assetHome, "data-home-v126-art-layer', 'single-canvas-ground-owned-sanctuary-framed-fissures-integrated-orb")
  has(assetHome, "data-home-visual-repair', 'v126-bounded-geology-continuous-ground-framed-fissures-integrated-orb")
  has(homeRuntime3d, 'HomeWorldProductionV70')
  has(homeRuntime3d, '<HomeV76Sanctuary')
  has(homeRuntime3d, 'data-home-primary-owner="asset-driven"')
  has(homeRuntime3d, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(homeRuntime3d, 'data-home-desktop-mobile-world="same-scene"')
  has(homeRuntime3d, 'data-home-embodied-self="privacy-preserving-first-person"')
  has(homeRuntime3d, 'data-home-movement="walk-keyboard-click-touch"')
  has(homeRuntime3d, 'data-testid="home-visible-navigable-sanctuary-world"')
  has(homeRuntime3d, 'data-testid="urai-home-webgl-orb"')
  has(homeRuntime3d, 'data-testid="urai-home-embodied-avatar"')
  has(homeRuntime3d, 'requestUraiWorldTravel')
  has(homeRuntime3d, 'URAI_ORB_STATE_EVENT')
  has(homeRuntime3d, 'resolveOrbSensoryOutput')
  assert.equal((homeRuntime3d.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('V159 keeps the V158 ground-integrated terrain and narrows the approach to a hairline trace while preserving the contained no-pedestal memory core', () => {
  for (const marker of [
    'function SculptedCanyonGround(',
    'home-v125-sculpted-canyon-ground',
    'function SanctuaryTerraces(',
    'home-v126-continuous-walkable-terrace-network',
    'home-v154-inlaid-stone-approach',
    'narrow-meandering-inlay-not-road-slab',
    'hairline-stone-trace-integrated-into-ground-no-road-read',
    'function GeologicalFrame(',
    'home-v126-bounded-geological-edge-masses',
    'scan-provenance-kept-off-axis-while-authored-ground-owns-frame',
    'scan-provenance-remains-off-axis-after-ground-scar-refinement',
    'function FramedFissure(',
    'home-v126-${side}-framed-fissure',
    'v154-buried-irregular-stone-fissure-no-facade-hoops-or-translucent-panels',
    'ground-laid-navigation-scar-no-upright-gate-silhouette',
    'function weatheredSanctuaryMassGeometry(',
    'home-v149-weathered-rift-threshold-sanctuary',
    'v154-faceted-broken-buttresses-no-rounded-boulder-gates',
    'terrain-relief-shelves-sunk-into-ground-no-boulder-piles',
    'ground-rift-bearing-mass',
    'life-map-rift-bearing-mass',
    'function ApseAndOrbCradle(',
    'home-v126-layered-apse-orb-cradle',
    'v154-broken-side-shelves-frame-orb-without-pedestal',
    'apse-ledges-sunk-into-terrain-clear-orb-air-gap',
    'function LivingOrb(',
    'home-v126-apse-integrated-orb',
    'home-v126-orb-memory-motes',
    'home-v154-orb-memory-depth-motes',
    'contained-memory-core-not-particle-fountain',
    'orb-floats-over-continuous-terrain-without-rock-cradle-clutter',
    "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
    'ORB_PALETTE',
    'home-v125-atmospheric-depth-motes',
    'v154-visible-canyon-fissures-memory-swarm-no-pedestal',
    'v158-ground-scar-thresholds-hairline-path-sunken-geology',
    'v157-canyon-path-thin-rifts-low-geology-contained-orb',
  ]) has(homeArt, marker)
  assert.doesNotMatch(homeArt, /function RelicMachine\(|function PortalRecess\(|<TerracedGround|name="home-v124-authored-asymmetric-landform"|name="home-v76-apse-embedded-orb-relic-machine"/)
  assert.doesNotMatch(homeArt, /function layeredSanctuaryWingGeometry|function cradleSupportGeometry|home-v148-open-buttress-threshold-sanctuary/)
  assert.doesNotMatch(homeArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.match(homeArt, /const stations = 80/)
  assert.match(homeArt, /const half = 0\.032 - t \* 0\.010/)
  assert.match(homeArt, /new THREE\.IcosahedronGeometry\(1, 2\)/)
  assert.match(homeArt, /new THREE\.IcosahedronGeometry\(0\.72, 3\)/)
  assert.match(homeArt, /for \(let index = 0; index < 980; index \+= 1\)/)
  assert.match(homeArt, /Array\.from\(\{ length: 6 \}/)
  assert.match(homeArt, /rotation=\{\[-1\.02, isGround \? 0\.16 : -0\.16, isGround \? -0\.12 : 0\.12\]\}/)
  assert.match(homeArt, /scale=\{isGround \? \[0\.24, 0\.44, 0\.28\] : \[0\.23, 0\.46, 0\.28\]\}/)
  assert.match(homeArt, /for \(let index = 0; index < 48; index \+= 1\)/)
  assert.match(homeArt, /new THREE\.ExtrudeGeometry\(frame, \{ depth: 0\.12/)
  assert.match(homeArt, /boxGeometry args=\{\[4\.20, 4\.20, 2\.80\]\}/)
  assert.match(homeArt, /name="home-v125-sculpted-canyon-ground"[^>]*>[\s\S]*?<meshPhysicalMaterial/)
  assert.match(homeArt, /retained-stone-provenance[^\n]*castShadow receiveShadow>/)
  assert.match(homeArt, /retired-threshold-panel[^\n]*geometry=\{field\}[^\n]*>/)
  assert.match(homeArt, /const rejectedHorizonRepeat = object\.name\.startsWith\('horizon-mountain-'\)/)
  assert.match(homeArt, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(homeArt, /<primitive object=\{orb\} visible=\{false\} \/>/)
  assert.match(homeArt, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onOrb\(\) \}\}/)
})

test('Home telemetry and destination authority remain aligned to the unchanged V70 runtime', () => {
  assert.match(assetHome, /const HOME_SPAWN = \{ x: 0, z: 4\.6 \} as const/)
  assert.match(assetHome, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
  assert.match(assetHome, /const HOME_GROUND = \{ x: -4\.85, z: -8\.25 \} as const/)
  assert.match(assetHome, /const HOME_LIFE_MAP = \{ x: 4\.85, z: -8\.25 \} as const/)
  assert.match(homeRuntime3d, /const SPAWN = new THREE\.Vector3\(0, 0\.04, 4\.6\)/)
  assert.match(homeRuntime3d, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(homeRuntime3d, /const GROUND = new THREE\.Vector3\(-4\.85, 0, -8\.25\)/)
  assert.match(homeRuntime3d, /const LIFE_MAP = new THREE\.Vector3\(4\.85, 0, -8\.25\)/)
  assert.match(homeRuntime3d, /destination: 'infrastructure-hub'/)
  assert.match(homeRuntime3d, /destination: 'life-map'/)
  assert.match(homeRuntime3d, /cameraCheckpoint: 'home-ground-descent'/)
  assert.match(homeRuntime3d, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(homeRuntime, /aria-label="Open Ground directly"/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
})

test('Ground remains a walkable infrastructure world with semantic exits', () => {
  for (const marker of ['data-ground-exploration="walkable"','data-ground-pointer-lock="false"','data-testid="urai-ground-private-workforce-world"','data-testid="urai-ground-walkable-surface"','ground-walkable-path-network','ground-central-nexus','stepEmbodiedMotion','useMovementInput','MobileMovementPad']) has(groundGraph, marker)
  assert.match(ground, /onEscape:\s*\(\) => router\.push\("\/home\?returnFrom=ground"\)/)
  assert.doesNotMatch(ground, /requestPointerLock|sprint|jump|crouch/i)
})

test('Life Map preserves independent travel, depth and semantic Focus/Replay exits', () => {
  for (const marker of ['KeyA','ArrowLeft','KeyQ','ArrowRight','KeyD','KeyE','urai:life-map-overview','life-map-movement-help']) has(lifeMapBoundary, marker)
  for (const marker of ['CameraRig','life-map-depth-near','life-map-depth-middle','life-map-depth-far','data-home-companion-owned="false"']) has(lifeMapScene, marker)
  for (const marker of ['life-map-light-bridges','life-map-privacy-vault','life-map-emotional-weather','life-map-far-future-horizon','QuadraticBezierCurve3']) has(lifeMapProduction, marker)
  assert.match(lifeMapScene, />Enter Focus<\/button>/)
  assert.match(lifeMapScene, />Replay<\/button>/)
  assert.doesNotMatch(lifeMapScene, /PersistentWorldCompanion|requestPointerLock/)
})

test('travel infrastructure keeps fallback and canonical ascent capability', () => {
  for (const marker of ['URAI_WORLD_TRAVEL_EVENT','buildFallbackHref','commitHardFallback','WORLD_TRAVEL_FALLBACK_MS','markHomeAscentClosing']) has(worldEvents, marker)
  for (const marker of ['beginTravelRef.current(request)','transitionDuration(request.destination)','router.push(href)','navigationWatchdog']) has(worldTransitions, marker)
  for (const marker of ['enterLifeMap: () => set({ mode: "ASCENT"','phase: "ASCENT"','isTransitioning: true','inputLocked: true','progress: 0']) has(sceneStore, marker)
  assert.match(worldShell, /const showWorldCompanion = world\.destination !== 'life-map'/)
  assert.match(routeOwner, /background:\s*transparent\s*!important/)
  assert.match(embodiedLayout, /data-world-destination='life-map'/)
})