import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const home = read('src/app/FinalHomeWorld.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundScene = read('src/app/ground/EmbodiedGroundScene.tsx')
const lifeMapBoundary = read('src/spatial/world/LifeMapIndependentInputBoundary.tsx')
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

test('Home is one coherent inhabitable sanctuary rather than a layered authored image', () => {
  has(homeRuntime, 'FinalHomeWorld')
  has(homeRuntime, 'data-urai-home-runtime="final-coherent-webgl-world"')
  has(homeRuntime, 'data-home-exploration="walkable"')
  for (const marker of [
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'data-testid="urai-home-walkable-surface"',
    'data-testid="urai-home-webgl-orb"',
    'home-visible-navigable-sanctuary-world',
    'home-memory-vignette-',
    'place-loved',
    'ride-home',
    'voices-dinner',
    'song-returned',
    'quiet-growth',
    'MemoryRoom',
    'MemoryContent',
    'SanctuaryWorld',
    'MobileMovementPad',
    'requestUraiWorldTravel',
    'Accessible Home destinations',
  ]) has(home, marker)
  assert.match(home, /<color attach="background"/)
  assert.match(home, /<fog attach="fog"/)
  assert.match(home, /shadows className="urai-final-home-canvas"/)
  assert.doesNotMatch(home, /assetCssStack|homeAssets|home-authored-desktop|home-authored-mobile/)
  assert.doesNotMatch(home, /background-image|var\(--home-authored/)
  assert.doesNotMatch(home, /requestPointerLock|sprint|jump|crouch/i)
})

test('Home replaces proof primitives and dominant UI with physical final-world ownership', () => {
  assert.match(home, /const ORB_POSITION = new THREE\.Vector3\(0, 1\.55, -1\.2\)/)
  has(home, 'name="home-final-orb"')
  has(home, 'name="home-final-embodied-self"')
  has(home, 'clearcoat={1}')
  has(home, 'castShadow')
  has(home, 'receiveShadow')
  assert.doesNotMatch(home, /urai-home-direct-controls|Walk the sanctuary|home-authored-orb-physical-hit-target/)
  assert.match(home, /left:-9999px/)
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

test('Life Map keeps independent non-Orb movement and overview recovery', () => {
  for (const marker of ['W/S or ↑/↓ move through depth', 'A/D, Q/E, or ←/→ glide between memories', 'glideDepth(-180)', 'glideDepth(180)', 'cycleMemory(-1)', 'cycleMemory(1)', 'life-map-embodied-controls', 'life-map-memory-portals', 'data-life-map-overview-control', 'urai:life-map-overview']) has(lifeMapBoundary, marker)
  assert.match(embodiedLayout, /data-world-destination='life-map'[\s\S]*\.life-map-movement-help/)
  assert.doesNotMatch(lifeMapBoundary, /Orb companion|PersistentWorldCompanion|requestPointerLock/)
})

test('embodied movement never removes semantic exits', () => {
  assert.match(home, />Ground<\/button>/)
  assert.match(home, />Life Map<\/button>/)
  assert.match(ground, /Escape to return Home/)
  assert.match(lifeMapBoundary, /ROUTE_ACTION_LABELS = new Set\(\['Enter Focus', 'Replay', 'Overview', 'Ground', 'Home'\]\)/)
  assert.match(worldShell, /embodiedExplorationLayout\.css/)
})
