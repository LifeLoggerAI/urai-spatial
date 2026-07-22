import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const finalHome = read('src/app/FinalHomeWorld.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundScene = read('src/app/ground/EmbodiedGroundScene.tsx')
const lifeMapBoundary = read('src/spatial/world/LifeMapIndependentInputBoundary.tsx')
const lifeMapScene = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')
const worldShell = read('src/spatial/world/UraiWorldShell.tsx')
const routeOwner = read('src/spatial/world/routeOwnerConvergence.css')
const embodiedLayout = read('src/spatial/world/embodiedExplorationLayout.css')

const has = (source, marker) => assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

test('shared movement kernel owns stable input, calm motion, boundaries and collision', () => {
  for (const marker of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'stepEmbodiedMotion', 'THREE.MathUtils.damp', 'MovementBounds', 'MovementObstacle', 'MobileMovementPad', 'MovementHelp', 'arrivalRadius', 'MOTION_REQUESTED', 'MOTION_FORWARD', 'MOTION_RIGHT', 'MOTION_NEXT']) has(kernel, marker)
  assert.match(kernel, /addEventListener\('keydown', onKeyDown, \{ passive: false, capture: true \}\)/)
  assert.match(kernel, /next\.x = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /next\.z = THREE\.MathUtils\.clamp/)
  assert.doesNotMatch(kernel, /requestPointerLock|pointerlockchange|movementX|movementY|sprint|jump|crouch/i)
})

test('Final Home is the active coherent physical sanctuary', () => {
  has(homeRuntime, 'FinalHomeWorld')
  has(homeRuntime, 'data-home-visual-owner="final-coherent-sanctuary"')
  has(homeRuntime, 'data-home-exploration="walkable"')
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld/)
  for (const marker of [
    'data-home-visible-world="final-physical-sanctuary-memory-rooms"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'data-testid="urai-home-walkable-surface"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
    'data-home-player-x',
    'data-home-player-z',
    'data-home-distance',
    'data-home-moving',
    'home-visible-navigable-sanctuary-world',
    'home-memory-vignette-',
    'place-loved',
    'ride-home',
    'voices-dinner',
    'song-returned',
    'quiet-growth',
    'MobileMovementPad',
    'requestUraiWorldTravel',
    'aria-label="Open Orb directly"',
    'aria-label="Open Ground directly"',
    'aria-label="Open Life Map directly"',
  ]) has(finalHome, marker)
  assert.doesNotMatch(finalHome, /assetCssStack|homeAssets|home-authored-desktop|urai-home-embodied-art|requestPointerLock|sprint|jump|crouch/i)
})

test('Home keeps one physical Orb and direct-access parity', () => {
  assert.match(finalHome, /const ORB_POSITION = new THREE\.Vector3\(0, 1\.55, -1\.2\)/)
  has(finalHome, 'name="home-final-orb-physical-anchor"')
  assert.match(finalHome, /<meshBasicMaterial transparent opacity=\{0\} colorWrite=\{false\} depthWrite=\{false\} \/>/)
  assert.match(worldShell, /const showWorldCompanion = world\.destination !== 'life-map'/)
  assert.match(routeOwner, /data-world-destination='home'[\s\S]*\.urai-world-companion__orb/)
  assert.match(routeOwner, /background:\s*transparent\s*!important/)
})

test('Ground remains walkable infrastructure with paths and collision ownership', () => {
  for (const marker of ['EmbodiedGroundScene', 'data-ground-exploration="walkable"', 'data-ground-pointer-lock="false"', 'aria-label="Ground destinations"', 'MobileMovementPad']) has(ground, marker)
  for (const marker of ['ground-walkable-navigation-surface', 'ground-walkable-path-network', 'ground-central-nexus', 'ground-enterable-threshold-', 'ground-workforce-and-council-presences', 'GROUND_OBSTACLES']) has(groundScene, marker)
  assert.match(embodiedLayout, /data-world-destination='infrastructure-hub'[\s\S]*\.urai-movement-help/)
  assert.doesNotMatch(groundScene, /requestPointerLock|sprint|jump|crouch/i)
})

test('Life Map keeps independent non-Orb travel, depth and overview recovery', () => {
  for (const marker of ['KeyA', 'ArrowLeft', 'KeyQ', 'KeyD', 'ArrowRight', 'KeyE', 'cycle(-1)', 'cycle(1)', 'urai:life-map-overview', 'life-map-movement-help']) has(lifeMapBoundary, marker)
  for (const marker of ['type JourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival"', 'goalForNode', 'CameraRig', 'life-map-depth-near', 'life-map-depth-middle', 'life-map-depth-far', 'setPhase("departure")', 'setPhase("travel")', 'setPhase("approach")', 'setPhase("arrival")', 'data-life-map-phase={phase}', 'data-home-companion-owned="false"']) has(lifeMapScene, marker)
  assert.match(embodiedLayout, /data-world-destination='life-map'[\s\S]*\.life-map-movement-help/)
  assert.doesNotMatch(lifeMapBoundary, /Orb companion|PersistentWorldCompanion|requestPointerLock/)
  assert.doesNotMatch(lifeMapScene, /PersistentWorldCompanion|requestPointerLock/)
})

test('embodied movement never removes semantic exits', () => {
  assert.match(finalHome, />Ground<\/button>/)
  assert.match(finalHome, />Life Map<\/button>/)
  assert.match(ground, /Escape to return Home/)
  assert.match(lifeMapScene, />Enter Focus<\/button>/)
  assert.match(lifeMapScene, />Replay<\/button>/)
  assert.match(lifeMapScene, />Overview<\/button>/)
  assert.match(lifeMapScene, /if \(selectedId\) overview\(\); else router\.push\("\/home"\)/)
  assert.match(worldShell, /embodiedExplorationLayout\.css/)
})
