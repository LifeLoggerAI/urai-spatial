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
const worldShell = read('src/spatial/world/UraiWorldShell.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const companionCss = read('src/spatial/world/persistentWorldCompanion.css')
const routeOwnerCss = read('src/spatial/world/routeOwnerConvergence.css')
const embodiedLayout = read('src/spatial/world/embodiedExplorationLayout.css')

test('shared movement kernel owns stable input listeners, calm motion, boundaries and collision', () => {
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
    'callbacksRef',
    'MOTION_REQUESTED',
    'MOTION_FORWARD',
    'MOTION_RIGHT',
    'MOTION_NEXT',
  ]) assert.match(kernel, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(kernel, /callbacksRef\.current = \{ onEscape, onInteract, onReset \}/)
  assert.match(kernel, /\}, \[enabled\]\)/)
  assert.match(kernel, /const requested = MOTION_REQUESTED\.set\(0, 0, 0\)/)
  assert.match(kernel, /const next = MOTION_NEXT\.copy\(position\)/)
  assert.match(kernel, /target\.current = null/)
  assert.match(kernel, /next\.x = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /next\.z = THREE\.MathUtils\.clamp/)
  assert.match(kernel, /distance >= obstacle\.radius/)
  assert.doesNotMatch(kernel, /useEffect\([\s\S]*?\}, \[enabled, onEscape, onInteract, onReset\]\)/)
  assert.doesNotMatch(kernel, /const requested = new THREE\.Vector3\(\)/)
  assert.doesNotMatch(kernel, /requestPointerLock|pointerlockchange|movementX|movementY/)
  assert.doesNotMatch(kernel, /sprint|jump|crouch/i)
})

test('Home has one authored visible Orb with transparent physical and semantic interaction owners', () => {
  assert.match(homeRuntime, /EmbodiedHomeSpatialCanvas/)
  assert.match(homeRuntime, /data-home-exploration="walkable"/)
  assert.match(home, /data-testid="urai-home-webgl-orb"/)
  assert.match(home, /name="home-authored-orb-physical-hit-target"/)
  assert.match(home, /const ORB_POSITION = new THREE\.Vector3\(0, 1\.55, -1\.15\)/)
  assert.match(home, /<meshBasicMaterial transparent opacity=\{0\} colorWrite=\{false\} depthWrite=\{false\} \/>/)
  assert.doesNotMatch(home, /name="home-only-companion"|emissiveIntensity=\{hovered|<pointLight color="#7cecf2"/)
  assert.match(worldShell, /const showWorldCompanion = world\.destination !== 'life-map'/)
  assert.match(worldShell, /const anchorToPhysicalHomeOrb = world\.destination === 'home'/)
  assert.match(worldShell, /<PersistentWorldCompanion anchorToPhysicalHomeOrb=\{anchorToPhysicalHomeOrb\}/)
  assert.match(companion, /anchorToPhysicalHomeOrb\?: boolean/)
  assert.match(companion, /data-home-physical-orb-anchor=\{anchorToPhysicalHomeOrb \? 'true' : 'false'\}/)
  assert.match(companion, /data-visual-orb-owner=\{anchorToPhysicalHomeOrb \? 'physical-home-orb' : 'persistent-companion'\}/)
  assert.match(companion, /anchorToPhysicalHomeOrb \? null : <span aria-hidden="true" \/>/)
  assert.match(companionCss, /data-home-physical-orb-anchor='true'[\s\S]*background: transparent/)
  assert.match(companionCss, /data-home-physical-orb-anchor='true'[\s\S]*box-shadow: none/)
  assert.match(companionCss, /data-home-physical-orb-anchor='true'[\s\S]*\.urai-world-companion__orb::before[\s\S]*display: none/)
  assert.match(routeOwnerCss, /data-world-destination='home'[\s\S]*\.urai-world-companion__orb[\s\S]*background:\s*transparent\s*!important/)
  assert.match(routeOwnerCss, /outline:\s*3px solid rgba\(224,255,255,.96\)\s*!important/)
  assert.doesNotMatch(worldShell, /world\.destination !== 'life-map' && world\.destination !== 'home'/)
  assert.match(home, /aria-label="Open Life Map directly"/)
  assert.match(home, /aria-label="Open Ground directly"/)
  assert.match(home, /aria-label="Open Orb directly"/)
  assert.match(home, /data-home-movement="walk-keyboard-click-touch"/)
  assert.match(home, /data-home-pointer-lock="false"/)
  assert.match(home, /home-walkable-sanctuary-floor/)
  assert.match(home, /walkTarget\.current = new THREE\.Vector3/)
  assert.match(home, /HOME_BOUNDS/)
  assert.match(home, /HOME_OBSTACLES/)
  assert.match(home, /const dOrb = distance2D/)
  assert.match(home, /let minDistance = Number\.POSITIVE_INFINITY/)
  assert.doesNotMatch(home, /const candidates:/)
  assert.doesNotMatch(home, /candidates\.sort/)
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

test('Ground is walkable infrastructure with memoized paths and collision ownership', () => {
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
  assert.match(groundScene, /const GROUND_OBSTACLES = DESTINATIONS\.map/)
  assert.match(groundScene, /const \{ paths, mainPoints \} = useMemo/)
  assert.match(groundScene, /<Line points=\{mainPoints\}/)
  assert.match(groundScene, /obstacles: GROUND_OBSTACLES/)
  assert.doesNotMatch(groundScene, /obstacles: DESTINATIONS\.map/)
  assert.match(groundScene, /destination\.workforceState === 'blocked'/)
  assert.match(groundScene, /destination\.availability === 'offline'/)
  assert.match(groundScene, /Press Enter or tap again to cross the threshold/)
  assert.match(embodiedLayout, /data-world-destination='infrastructure-hub'[\s\S]*\.urai-movement-help[\s\S]*top: max\(118px/)
  assert.match(embodiedLayout, /\.ground-movement-prompt[\s\S]*bottom: max\(238px/)
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
  assert.match(embodiedLayout, /data-world-destination='life-map'[\s\S]*\.life-map-movement-help[\s\S]*top: max\(78px/)
  assert.doesNotMatch(lifeMapBoundary, /Orb companion|PersistentWorldCompanion|requestPointerLock/)
})

test('embodied movement never removes essential exits or semantic controls', () => {
  assert.match(home, />Ground<\/button>/)
  assert.match(home, />Life Map<\/button>/)
  assert.match(ground, /Escape to return Home/)
  assert.match(ground, /destination\.href/)
  assert.match(lifeMapBoundary, /ROUTE_ACTION_LABELS = new Set\(\['Enter Focus', 'Replay', 'Overview', 'Ground', 'Home'\]\)/)
  assert.match(lifeMapBoundary, /findOverviewButton/)
  assert.match(worldShell, /embodiedExplorationLayout\.css/)
})
