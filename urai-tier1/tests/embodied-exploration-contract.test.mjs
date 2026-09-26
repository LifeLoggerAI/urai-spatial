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
const homePolish = read('src/spatial/layout/HomeWorldProductionV225PolishV3.tsx')
const homeArtRepair = read('src/spatial/layout/HomeCurrentArtRepair.tsx')
const homeVisualAuthority = read('src/spatial/layout/HomeVisualAuthority.tsx')
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
  assert.match(travel, /\.urai-mobile-movement\{[^}]*pointer-events:none/)
  assert.match(travel, /button\{pointer-events:auto;width:48px;height:48px;/)
})

test('Home keeps one V223 Canvas owner with direct bodyless first-person presence, authored Orb, physical Ground and broad Sky ascent', () => {
  has(homeRuntime, 'HomeWorldProductionV223 as HomeWorldProduction')
  for (const marker of [
    'export function HomeWorldProductionV223',
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    'data-home-visible-world="cinematic-lived-world-threshold"',
    'bodyless-first-person-home',
    'home-first-person',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'data-home-presence-policy="direct-first-person-camera-only-no-hands-body-rig"',
    'data-home-avatar-activation-gate="none-direct-first-person-home"',
    'direct-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'useHomeExperienceController',
    'HOME_WALK_SPEED','HOME_WALK_ACCELERATION','HOME_WALK_DECELERATION',
    'useMovementInput({','stepEmbodiedMotion({',
    '<MobileMovementPad input={movementInput} label="Move through Home" />',
    'data-home-movement={firstPerson ? \'shared-keyboard-touch-walk-look-interact\'',
    'aria-label="Open Avatar Self View"',
  ]) has(activeHomeRuntime3d, marker)
  assert.match(activeHomeRuntime3d, /firstPersonStable[\s\S]*\? \(portrait \? 66 : 58\)/)
  assert.match(activeHomeRuntime3d, /yaw: -yaw\.current/)
  assert.match(activeHomeRuntime3d, /acceleration: HOME_WALK_ACCELERATION/)
  assert.match(activeHomeRuntime3d, /deceleration: HOME_WALK_DECELERATION/)
  assert.equal((activeHomeRuntime3d.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(activeHomeRuntime3d, /<HomeEmbodiedAvatar|visible-avatar-presentation-activation-gate|home-avatar-presentation|presentation-avatar-then-first-person-camera-only-no-hands-body-rig/)
  assert.doesNotMatch(activeHomeRuntime3d, /visible-cinematic-avatar|visible-avatar-third-person|hidden-exterior-avatar-first-person/)
  assert.doesNotMatch(activeHomeRuntime3d, /privacy-preserving-first-person/)
  assert.doesNotMatch(activeHomeRuntime3d, /first-person-hand|fps-hand|player-hands|weapon-rig/i)
  assert.doesNotMatch(activeHomeRuntime3d, /const keys = useRef\(new Set<string>\(\)\)/)
  for (const source of [homePolish, homeArtRepair, homeVisualAuthority]) assert.doesNotMatch(source, /<Canvas/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
test('current Home art chain keeps legacy hotspot geometry retired while preserving inhabited threshold and current Orb authority', () => {
  for (const marker of [
    "import { HomeCurrentArtRepair } from './HomeCurrentArtRepair'",
    "import { HomeAAAVisualRepair } from './HomeAAAVisualRepair'",
    "import { HomeVisualAuthority } from './HomeVisualAuthority'",
    '<HomeCurrentArtRepair orbState={orbState}',
    '<HomeAAAVisualRepair />',
    '<HomeVisualAuthority>',
    'function RetireLegacyHomeHotspots()',
    '/home-v226-ground-inhabited-hearth/',
    '/home-v231-ground-weathered-threshold/',
    '/home-current-ground-geological-descent/',
    '/home-aaa-v281-ground-recessed-geological-descent/',
    '/home-v282-ground-geology/',
    '/home-v226-rooted-single-living-memory-presence/',
    '/home-current-orb/',
    '/home-orb-/',
    "const CURRENT_HOME_PRESENCE_ROOTS = new Set(['home-living-memory-orb', 'home-orb-living-memory-visible-authority'])",
  ]) has(activeHomeRuntime3d, marker)

  for (const marker of [
    'same-world-inhabited-home-threshold-v1',
    'portal: false',
    'open toward the winding Home terrain and broad',
    'inhabited threshold rather than an outdoor',
    'canyon or portal lobby',
  ]) has(homeArtRepair, marker)

  for (const marker of [
    'Current Home Orb visual authority boundary.',
    'The living-memory runtime owns its translucent shell',
    'home-orb-living-memory-visible-authority',
    '>{children}</group>',
  ]) has(homeVisualAuthority, marker)

  assert.match(homePolish, /name="home-v226-ground-inhabited-hearth"/)
  assert.match(homePolish, /name="home-v226-rooted-single-living-memory-presence"/)
  assert.doesNotMatch(homeArtRepair, /<Canvas/)
  assert.doesNotMatch(homeVisualAuthority, /<Canvas/)
  assert.doesNotMatch(homePolish, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
  assert.doesNotMatch(homeArtRepair, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
  assert.doesNotMatch(homeVisualAuthority, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})

test('current Home telemetry and destination authority stay bound to the V223 owner', () => {
  for (const marker of ['const HOME_FOCUS = new THREE.Vector3(','const ORB_POSITION = new THREE.Vector3(','URAI_ORB_STATE_EVENT','resolveOrbSensoryOutput','requestUraiWorldTravel',"destination: 'infrastructure-hub'","destination: 'life-map'",'requestUraiWorldOrbOpen']) has(activeHomeRuntime3d, marker)
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
