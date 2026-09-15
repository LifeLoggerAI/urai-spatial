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
const activeHomeRuntime3d = read('src/spatial/layout/HomeWorldProductionGroundCanon.tsx')
const predecessorHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const homeRuntime3d = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const ground = read('src/app/GroundSpatialWorldCanon.tsx')
const groundRoute = read('src/app/ground/page.tsx')
const groundContract = read('src/spatial/world/homeGroundContract.ts')
const gateway = read('src/spatial/world/GroundGateway.tsx')
const navigationCss = read('src/spatial/world/worldNavigation.css')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const travel = read('src/spatial/navigation/EmbodiedNavigation.tsx')

test('shared movement kernel preserves stable embodied controls and bounded motion without Home coordinate ownership', () => {
  for (const marker of ['useMovementInput','stepEmbodiedMotion','MovementBounds','THREE.MathUtils.clamp']) has(travel, marker)
  assert.doesNotMatch(travel, /embodied-motion-kernel-v66|homeDistanceLifeMap|homeDistanceGround|spawnX\s*=\s*4\.45/)
})

test('Home uses the canonical overview owner while V223 remains predecessor provenance', () => {
  has(homeRuntime, 'HomeWorldProductionGroundCanon as HomeWorldProduction')
  has(activeHomeRuntime3d, 'export function HomeWorldProductionGroundCanon')
  for (const marker of [
    'data-home-visible-world="cinematic-lived-world-threshold"',
    'data-home-embodied-self="visible-cinematic-avatar"',
    'data-home-movement="camera-look-world-surface-selection"',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'data-home-avatar-entry="visible-user-avatar"',
    'data-home-ground-transition-owner="home-camera-rig-only"',
    'createGroundEntryCheckpoint',
    'writeGroundEntryCheckpoint',
    'GROUND_PREPARE',
    'GROUND_DESCENT',
    'GROUND_EYE_HEIGHT = 1.70',
    'HomeVisualAuthority',
  ]) has(activeHomeRuntime3d, marker)
  assert.equal((activeHomeRuntime3d.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(activeHomeRuntime3d, /stepEmbodiedMotion|useMovementInput|MobileMovementPad/)
  assert.match(activeHomeRuntime3d, /router\.push\('\/ground\/\?from=home-ground&cameraCheckpoint=ground-first-person-arrival'\)/)
  assert.doesNotMatch(activeHomeRuntime3d, /hit\.y - .*\.34/)
  assert.match(predecessorHome, /export function HomeWorldProductionV223/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('Home Ground contract carries deterministic selected-point continuity and unwind timings', () => {
  for (const marker of [
    "HOME_GROUND_CONTRACT_VERSION = 'urai-home-ground-canon-1'",
    'descentMs: 1800',
    'firstPersonTakeoverMs: 1620',
    'unwindMs: 1650',
    'groundCameraReleaseMs: 740',
    'createGroundEntryCheckpoint',
    'normalizedSurfaceUV',
    'groundSpawn',
    'writeHomeReturnCheckpoint',
    'GROUND_UNWIND_EVENT',
  ]) has(groundContract, marker)
})

test('Ground is first-person, mapped from Home, explorable, collision-aware and unwindable', () => {
  for (const marker of [
    'function GroundWorld(',
    'function FirstPersonRig(',
    'function UnwindCamera(',
    'stepEmbodiedMotion({',
    'useMovementInput({',
    "const EYE_HEIGHT = 1.70",
    'const WALK_SPEED = 1.85',
    'const MAX_STEP_HEIGHT = .28',
    'const MAX_WALK_SLOPE_DEGREES = 42',
    'COLLISION_OBSTACLES',
    'readGroundEntryCheckpoint()',
    'data-ground-exploration="first-person"',
    'data-ground-camera="eye-level-terrain-following"',
    'data-ground-movement="hybrid-continuous-target-walk"',
    'data-ground-collision="terrain-slope-step-and-authored-obstacles"',
    "requestGroundUnwind('return-control')",
    "beginUnwind('escape')",
  ]) has(ground, marker)
  assert.doesNotMatch(ground, /router\.push\("\/home\?returnFrom=ground"\)|GroundPhysicalArchitecture|ground-destination-compass/)
  has(groundRoute, 'GroundSpatialWorldCanon')
  assert.doesNotMatch(groundRoute, /GroundFocusContainment|GroundCheckpointRestoreSignal|GroundSpatialWorldClean/)
})

test('Ground gateway is semantic fallback only and old portal visuals are retired', () => {
  has(gateway, 'data-ground-gateway="semantic-fallback-only"')
  has(gateway, 'data-pointer-owner="false"')
  assert.doesNotMatch(gateway, /focus-ring|ground-gateway__surface/)
  assert.doesNotMatch(navigationCss, /urai-ground-aperture-open|repeating-radial-gradient|radial-gradient\(ellipse at 50% 76%/)
  assert.match(navigationCss, /Home <-> Ground owns its physical camera choreography/)
})

test('V185 predecessor art provenance remains reproducible after successor advancement', () => {
  for (const marker of [
    'function SculptedCanyonGround(', 'home-v125-sculpted-canyon-ground',
    'continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase',
    'home-v126-continuous-walkable-terrace-network',
    'legacy-alcove-meshes-remain-disabled-no-gate-facade',
    'function LivingOrb(', 'home-v126-apse-integrated-orb',
    'v185-continuous-weathered-canyon-camera-safe-destination-basins-large-contained-memory-orb-no-runway',
  ]) has(homeArt, marker)
  assert.doesNotMatch(homeArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(homeArt, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})

test('Historical V70 telemetry and destination authority remain reproducible', () => {
  for (const marker of ['const ORB = new THREE.Vector3(','const GROUND = new THREE.Vector3(','const LIFE_MAP = new THREE.Vector3(','URAI_ORB_STATE_EVENT','resolveOrbSensoryOutput','requestUraiWorldTravel',"destination: 'infrastructure-hub'","destination: 'life-map'",'requestUraiWorldOrbOpen']) has(homeRuntime3d, marker)
})

test('Life Map keeps its independent canonical embodied contract', () => {
  for (const marker of ['SpatialLifeMapCanonical','LifeMapRouteBoundary','requestUraiWorldReturn','data-private-memory-mounted="false"','data-life-map-access={mode}']) has(lifeMap, marker)
})

test('travel infrastructure keeps movement input and virtual controls for embodied realms', () => {
  for (const marker of ['useMovementInput','stepEmbodiedMotion','setVirtualMovement','clearVirtualMovement']) has(travel, marker)
})
