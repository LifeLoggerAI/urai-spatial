import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')

const kernel = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const home = read('src/app/EmbodiedHomeSpatialCanvas.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundScene = read('src/app/ground/EmbodiedGroundScene.tsx')
const lifeMapBoundary = read('src/spatial/world/LifeMapIndependentInputBoundary.tsx')

test('shared movement kernel owns calm keyboard, touch, damping, boundaries and collision', () => {
  for (const marker of [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'stepEmbodiedMotion',
    'THREE.MathUtils.damp',
    'MovementBounds',
    'MovementObstacle',
    'MobileMovementPad',
    'MovementHelp',
    'arrivalRadius',
  ]) assert.match(kernel, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(kernel, /target\.current = null/)
  assert.match(kernel, /next\.x = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /next\.z = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /distance >= obstacle\.radius/)
  assert.doesNotMatch(kernel, /requestPointerLock|pointerlockchange|movementX|movementY/)
  assert.doesNotMatch(kernel, /sprint|jump|crouch/i)
})

test('Home is an inhabitable sanctuary with physical approach and direct access parity', () => {
  assert.match(homeRuntime, /EmbodiedHomeSpatialCanvas/)
  assert.match(homeRuntime, /data-home-exploration="walkable"/)
  assert.match(homeRuntime, /Open Life Map directly/)
  assert.match(homeRuntime, /Open Ground directly/)
  assert.match(homeRuntime, /Open Orb directly/)
  assert.match(home, /data-home-movement="walk-keyboard-click-touch"/)
  assert.match(home, /data-home-pointer-lock="false"/)
  assert.match(home, /home-walkable-sanctuary-floor/)
  assert.match(home, /walkTarget\.current = new THREE\.Vector3/)
  assert.match(home, /HOME_BOUNDS/)
  assert.match(home, /obstacles:\s*\[/)
  assert.match(home, /nearby\.current === 'orb'/)
  assert.match(home, /nearby\.current === 'avatar'/)
  assert.match(home, /nearby\.current === 'ground'/)
  assert.match(home, /nearby\.current === 'life-map'/)
  assert.match(home, /MobileMovementPad/)
  assert.match(home, /aria-label="Direct Home destinations"/)
  assert.match(home, /prefers-reduced-motion:reduce/)
  assert.match(home, /requestUraiWorldTravel/)
  assert.doesNotMatch(home, /requestPointerLock|sprint|jump|crouch/i)
})

test('Ground is walkable infrastructure with paths, Nexus, chamber thresholds and semantic fast travel', () => {
  assert.match(ground, /EmbodiedGroundScene/)
  assert.match(ground, /data-ground-exploration="walkable"/)
  assert.match(ground, /data-ground-pointer-lock="false"/)
  assert.match(ground, /aria-label="Ground destinations"/)
  assert.match(ground, /Direct travel/)
  assert.match(ground, /MobileMovementPad/)
  assert.match(ground, /prefers-reduced-motion:reduce/)
  assert.match(groundScene, /ground-walkable-navigation-surface/)
  assert.match(groundScene, /ground-walkable-path-network/)
  assert.match(groundScene, /ground-central-nexus/)
  assert.match(groundScene, /ground-enterable-threshold-/)
  assert.match(groundScene, /ground-workforce-and-council-presences/)
  assert.match(groundScene, /DESTINATIONS\.map\(\(destination\) => \(\{ x: destination\.position\[0\]/)
  assert.match(groundScene, /destination\.workforceState === 'blocked'/)
  assert.match(groundScene, /destination\.availability === 'offline'/)
  assert.match(groundScene, /Press Enter or tap again to cross the threshold/)
  assert.doesNotMatch(groundScene, /requestPointerLock|sprint|jump|crouch/i)
})

test('Life Map keeps its independent non-Orb movement language and orientation recovery', () => {
  assert.match(lifeMapBoundary, /W\/S or ↑\/↓ move through depth/)
  assert.match(lifeMapBoundary, /A\/D, Q\/E, or ←\/→ glide between memories/)
  assert.match(lifeMapBoundary, /glideDepth\(-180\)/)
  assert.match(lifeMapBoundary, /glideDepth\(180\)/)
  assert.match(lifeMapBoundary, /cycleMemory\(-1\)/)
  assert.match(lifeMapBoundary, /cycleMemory\(1\)/)
  assert.match(lifeMapBoundary, /event\.code === 'KeyR'/)
  assert.match(lifeMapBoundary, /event\.code === 'KeyO'/)
  assert.match(lifeMapBoundary, /event\.code === 'Home'/)
  assert.match(lifeMapBoundary, /life-map-embodied-controls/)
  assert.match(lifeMapBoundary, /min-width:48px/)
  assert.match(lifeMapBoundary, /aria-live="polite"/)
  assert.match(lifeMapBoundary, /life-map-accessibility-menu/)
  assert.match(lifeMapBoundary, /life-map-memory-portals/)
  assert.doesNotMatch(lifeMapBoundary, /Orb companion|PersistentWorldCompanion|requestPointerLock/)
})

test('embodied movement never removes essential exits or semantic controls', () => {
  assert.match(home, />Ground<\/button>/)
  assert.match(home, />Life Map<\/button>/)
  assert.match(ground, /Escape to return Home/)
  assert.match(ground, /destination\.href/)
  assert.match(lifeMapBoundary, /ROUTE_ACTION_LABELS = new Set\(\['Enter Focus', 'Replay', 'Overview', 'Ground', 'Home'\]\)/)
  assert.match(lifeMapBoundary, /findOverviewButton/)
})
