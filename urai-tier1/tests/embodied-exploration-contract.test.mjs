import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const has = (source, marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

const homeGraph = read('src/app/AssetDrivenHomeWorld.tsx')
const homeRuntime = read('src/spatial/layout/HomeWorldProduction.tsx')
const activeHomeRuntime3d = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const homeRuntime3d = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const travel = read('src/spatial/navigation/EmbodiedNavigation.tsx')

test('shared movement kernel preserves stable embodied controls and bounded motion without Home coordinate ownership', () => {
  for (const marker of ['useMovementInput','stepEmbodiedMotion','MovementBounds','THREE.MathUtils.clamp']) has(travel, marker)
  assert.doesNotMatch(travel, /embodied-motion-kernel-v66|homeDistanceLifeMap|homeDistanceGround|spawnX\s*=\s*4\.45/)
})

test('shared drag-look preserves click ownership until pointer motion proves a drag', () => {
  for (const marker of ['DRAG_ACTIVATION_DISTANCE_PX = 4','Math.hypot(event.clientX - active.startX, event.clientY - active.startY)','if (distance < DRAG_ACTIVATION_DISTANCE_PX) return','active.captured = true']) has(travel, marker)
  assert.doesNotMatch(travel, /drag\.current = \{ pointerId: event\.pointerId, x: event\.clientX, y: event\.clientY \}\s*\n\s*try \{ event\.currentTarget\.setPointerCapture/)
})

test('mobile movement controls remain touch/coarse-pointer affordances instead of permanent desktop HUD', () => {
  assert.match(travel, /\.urai-mobile-movement\{display:none;/)
  assert.match(travel, /@media\(max-width:900px\),\(pointer:coarse\)\{\.urai-mobile-movement\{display:grid\}\}/)
  for (const marker of ['minWidth', 'MobileMovementPad']) {
    if (marker === 'MobileMovementPad') has(travel, marker)
  }
  assert.match(travel, /button\{width:48px;height:48px;/)
})

test('Home keeps one V223 Canvas owner with Avatar presentation then bodyless first-person presence, authored Orb, physical Ground and broad Sky ascent', () => {
  has(homeRuntime, 'HomeWorldProductionV223 as HomeWorldProduction')
  for (const marker of [
    'export function HomeWorldProductionV223',
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    'data-home-visible-world="cinematic-lived-world-threshold"',
    'HomeEmbodiedAvatar',
    'visible-avatar-presentation-activation-gate',
    'bodyless-first-person-home',
    'avatar-embodiment-transition',
    'home-avatar-presentation',
    'home-first-person',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'useHomeExperienceController',
    'homeApi.activateAvatar()',
    'HOME_WALK_SPEED',
    'HOME_WALK_ACCELERATION',
    'HOME_WALK_DECELERATION',
    'useMovementInput({',
    'stepEmbodiedMotion({',
    '<MobileMovementPad input={movementInput} label="Move through Home" />',
    'data-home-movement={firstPerson ? \'shared-keyboard-touch-walk-look-interact\'',
    'presentation-avatar-then-first-person-camera-only-no-hands-body-rig',
  ]) has(activeHomeRuntime3d, marker)
  assert.match(activeHomeRuntime3d, /firstPersonStable[\s\S]*\? \(portrait \? 66 : 58\)/)
  assert.match(activeHomeRuntime3d, /yaw: -yaw\.current/)
  assert.match(activeHomeRuntime3d, /acceleration: HOME_WALK_ACCELERATION/)
  assert.match(activeHomeRuntime3d, /deceleration: HOME_WALK_DECELERATION/)
  assert.equal((activeHomeRuntime3d.match(/<Canvas/g) ?? []).length, 1)
  assert.match(activeHomeRuntime3d, /<HomeEmbodiedAvatar/)
  assert.doesNotMatch(activeHomeRuntime3d, /visible-cinematic-avatar|visible-avatar-third-person|hidden-exterior-avatar-first-person/)
  assert.doesNotMatch(activeHomeRuntime3d, /privacy-preserving-first-person/)
  assert.doesNotMatch(activeHomeRuntime3d, /first-person-hand|fps-hand|player-hands|weapon-rig/i)
  assert.doesNotMatch(activeHomeRuntime3d, /const keys = useRef\(new Set<string>\(\)\)/)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
test('V185 preserves embodied authority while repairing contour terrain, camera clipping, weak destinations and weak Orb presence', () => {
  for (const marker of [
    'function SculptedCanyonGround(', 'home-v125-sculpted-canyon-ground',
    'continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase',
    'home-v126-continuous-walkable-terrace-network',
    'governed-landscape-provenance-retained-nonrendered-single-ground-owner',
    'legacy-alcove-meshes-remain-disabled-no-gate-facade',
    'edge-scans-outside-primary-frustum-no-pasted-islands',
    'function FramedFissure(', 'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',
    'camera-safe-basin-wide-ground-level-signal-place-no-upright-gate', 'home-v175-${side}-terrain-signal-veins',
    'function weatheredSanctuaryMassGeometry(', 'home-v149-weathered-rift-threshold-sanctuary',
    'detached-mass-family-retained-as-nonrendered-provenance-no-piles',
    'function ApseAndOrbCradle(', 'home-v126-layered-apse-orb-cradle',
    'detached-apse-masses-retained-nonrendered-no-pedestal',
    'function LivingOrb(', 'home-v126-apse-integrated-orb', 'home-v126-orb-memory-motes',
    'home-v154-orb-memory-depth-motes', 'home-v174-orb-memory-nucleus-motes', 'home-v179-orb-memory-heart-motes',
    'single-connected-folded-memory-mantle-with-state-specific-silhouette-timing-emission-and-surface-response',
    'v185-continuous-weathered-canyon-camera-safe-destination-basins-large-contained-memory-orb-no-runway',
    'remove-contour-staircase-carve-camera-safe-destination-basins-brighten-world-sky-enlarge-point-orb-hide-solid-seed',
  ]) has(homeArt, marker)
  assert.match(homeArt, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(homeArt, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
  assert.match(homeArt, /<primitive object=\{environment\} visible=\{false\} \/>/)
  assert.match(homeArt, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.match(homeArt, /name="home-v126-apse-integrated-orb"[^>]*scale=\{motion\.scale\}/)
  assert.match(homeArt, /name="home-v182-orb-faceted-mineral-seed"[^>]*visible=\{false\}/)
  assert.match(homeArt, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.doesNotMatch(homeArt, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.doesNotMatch(homeArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(homeArt, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})

test('Historical V70 telemetry and destination authority remain reproducible after successor advancement', () => {
  for (const marker of ['const ORB = new THREE.Vector3(','const GROUND = new THREE.Vector3(','const LIFE_MAP = new THREE.Vector3(','URAI_ORB_STATE_EVENT','resolveOrbSensoryOutput','requestUraiWorldTravel',"destination: 'infrastructure-hub'","destination: 'life-map'",'requestUraiWorldOrbOpen']) has(homeRuntime3d, marker)
})

test('Ground and Life Map keep their canonical embodied contracts', () => {
  for (const marker of [
    'function LivedGroundWorld(',
    'function FirstPersonPlayer(',
    'stepEmbodiedMotion({',
    'useMovementInput({',
    'data-ground-exploration="first-person-no-visible-body"',
    'data-ground-camera="eye-level-terrain-following-no-authored-bob"',
    'data-ground-collision="terrain-plus-authored-obstacle-field"',
    'data-ground-private-location-mounted="false"',
  ]) has(ground, marker)
  assert.doesNotMatch(ground, /GroundPhysicalArchitecture|ground-destination-compass|router\.push\(destination\.href\)/)
  for (const marker of ['SpatialLifeMapCanonical','LifeMapRouteBoundary','requestUraiWorldReturn','data-private-memory-mounted="false"','data-life-map-access={mode}']) has(lifeMap, marker)
})

test('travel infrastructure keeps movement input and virtual controls for Ground and other embodied realms', () => {
  for (const marker of ['useMovementInput','stepEmbodiedMotion','setVirtualMovement','clearVirtualMovement']) has(travel, marker)
})
