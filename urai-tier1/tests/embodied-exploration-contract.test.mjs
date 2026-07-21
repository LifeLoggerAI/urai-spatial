import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const home = read('src/app/EmbodiedHomeSpatialCanvas.tsx')
const sanctuary = read('src/app/HomeSanctuaryWorld.tsx')
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

test('Home is a visibly inhabitable sanctuary rather than a static authored image', () => {
  has(homeRuntime, 'EmbodiedHomeSpatialCanvas')
  has(homeRuntime, 'data-home-exploration="walkable"')
  for (const marker of [
    'HomeSanctuaryWorld',
    'data-home-visible-world="sanctuary-geometry-memory-vignettes"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'data-testid="urai-home-walkable-surface"',
    'data-testid="urai-home-webgl-orb"',
    'data-home-player-x',
    'data-home-player-z',
    'data-home-distance',
    'data-home-moving',
    '--home-parallax-x',
    '--home-parallax-y',
    'aria-label="Open Orb directly"',
    'aria-label="Open Ground directly"',
    'aria-label="Open Life Map directly"',
    'MobileMovementPad',
    'requestUraiWorldTravel',
  ]) has(home, marker)
  assert.match(home, /background-position:calc\(50% \+ var\(--home-parallax-x,0px\)\) calc\(48% \+ var\(--home-parallax-y,0px\)\)/)
  assert.doesNotMatch(home, /var\(--home-walk-[xz],0\)\s*\*/)
  assert.doesNotMatch(home, /requestPointerLock|sprint|jump|crouch/i)

  for (const marker of [
    'home-visible-navigable-sanctuary-world',
    'home-sanctuary-spatial-architecture',
    'home-sanctuary-memory-dust',
    'home-memory-vignette-',
    'place-loved',
    'ride-home',
    'voices-dinner',
    'song-returned',
    'quiet-growth',
    'SanctuaryArchitecture',
    'SanctuaryDust',
    'MemoryVignette',
  ]) has(sanctuary, marker)
})

test('Home keeps one authored Orb and direct-access parity', () => {
  assert.match(home, /const ORB_POSITION = new THREE\.Vector3\(0, 1\.55, -1\.15\)/)
  has(home, 'name="home-authored-orb-physical-hit-target"')
  assert.match(home, /<meshBasicMaterial transparent opacity=\{0\} colorWrite=\{false\} depthWrite=\{false\} \/>/)
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
