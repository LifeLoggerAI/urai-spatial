import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const has = (source, marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

const ground = read('src/app/GroundSpatialWorldClean.tsx')
const canon = read('src/spatial/ground/groundCanon.ts')
const orbBridge = read('src/spatial/ground/GroundOrbCompanion.tsx')
const navigation = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const hapticRegistry = read('src/spatial/haptics/hapticCueRegistry.ts')
const hapticRuntime = read('src/spatial/haptics/HapticRuntime.tsx')

test('Ground locomotion matches locked human-scale first-person canon', () => {
  for (const marker of [
    'GROUND_EYE_HEIGHT_M = 1.69',
    'GROUND_LANDSCAPE_FOV_DEG = 58',
    'GROUND_PORTRAIT_FOV_DEG = 66',
    'GROUND_NEAR_PLANE_M = 0.08',
    'GROUND_DESKTOP_SPEED_MPS = 2.55',
    'GROUND_MOBILE_SPEED_MPS = 2.4',
    'GROUND_VR_SPEED_MPS = 1.6',
    'GROUND_PRECISION_SPEED_MPS = 1.15',
    'GROUND_ACCELERATION_MPS2 = 8.5',
    'GROUND_DECELERATION_MPS2 = 10.2',
    'GROUND_ARRIVAL_RADIUS_M = 0.32',
    'GROUND_PLAYER_RADIUS_M = 0.28',
  ]) has(canon, marker)
  for (const marker of [
    'data-ground-exploration="first-person-no-visible-body"',
    'data-ground-visible-avatar="false"',
    'data-ground-visible-hands="false"',
    'data-ground-pointer-lock="false"',
    'speed: baseSpeed * slopeMultiplier',
    'obstacles: [...obstacles]',
  ]) has(ground, marker)
  has(navigation, 'DRAG_ACTIVATION_DISTANCE_PX = 4')
  assert.doesNotMatch(ground, /requestPointerLock|KeyShift|sprint|jump|crouch/i)
  assert.doesNotMatch(ground, /speed:\s*3\.7|acceleration:\s*12|deceleration:\s*14/)
})

test('Ground keeps slope, obstacle and world-depth production behavior', () => {
  for (const marker of [
    'if (degrees <= 18) return 1',
    'if (degrees <= 28)',
    'if (degrees <= 36)',
    'return 0',
    "profile === 'arid'",
    "profile === 'coastal'",
    'treeObstacles',
    'rockObstacles',
  ]) has(canon, marker)
  for (const marker of [
    'data-ground-collision="terrain-plus-authored-obstacle-field"',
    'slopeDegrees(',
    'slopeSpeedMultiplier(',
    'DistantGroundContinuation',
    'perceivedRangeMeters: 400',
    'far: 800',
  ]) has(ground, marker)
})

test('Ground renders no follower Orb while preserving semantic UrAi access', () => {
  for (const marker of [
    'Ground deliberately renders no follower Orb',
    "groundOrbMode = 'semantic-invocation-only'",
    "style.setProperty('opacity', '0', 'important')",
    "addEventListener('focus', reveal)",
    'no follower Orb is rendered',
    'return null',
  ]) has(orbBridge, marker)
  assert.doesNotMatch(orbBridge, /ground-physical-orb|single-ground-world-orb|preferredDistanceM|catchupDistanceM|icosahedronGeometry|pointLight/)
  assert.doesNotMatch(canon, /GROUND_ORB|orbCoherence/)
  assert.doesNotMatch(ground, /The physical Orb is present in the world\./)
})

test('Ground atmosphere uses bounded physical variables rather than screen-tint emotion labels', () => {
  for (const marker of [
    'skyLuminance', 'directWarmth', 'ambientCoolness', 'cloudCoverage', 'horizonClarity',
    'windMean', 'windVariance', 'atmosphericDensity', 'movementEnergy', 'shadowDefinition',
    'THREE.MathUtils.clamp(next[key], 0, 1)',
  ]) has(canon, marker)
  assert.doesNotMatch(canon, /sad\s*=\s*rain|happy\s*=\s*sun|angry\s*=\s*red|fear\s*=\s*lightning/i)
})

test('Ground retains accessible coarse-pointer movement and filmic rendering', () => {
  for (const marker of [
    'GroundAnalogPad',
    'max = 38',
    '< 0.14 ? 0',
    '<MobileMovementPad',
    'ACESFilmicToneMapping',
    'toneMappingExposure = 0.90',
  ]) has(ground, marker)
})

test('Ground natural profiles cannot regress to repeated rock-tile paving', () => {
  for (const marker of [
    'const naturalSoilProfile = profile.id === "temperate" || profile.id === "woodland"',
    'if (naturalSoilProfile)',
    'roughness={0.985}',
    'ground-v22-natural-soil-irregular-canopy-atmospheric-depth',
  ]) has(ground, marker)
  const naturalBranch = ground.match(/if \(naturalSoilProfile\) \{[\s\S]*?\n  \}/)?.[0] ?? ''
  assert.doesNotMatch(naturalBranch, /map=\{albedo\}|normalMap=\{normal\}|aoMap=\{arm\}|roughnessMap=\{arm\}|metalnessMap=\{arm\}/)
})

test('Ground haptics use semantic activation and arrival cues instead of portal spectacle', () => {
  for (const marker of [
    "'ground-activation': { id: 'ground-activation'",
    "'ground-arrival': { id: 'ground-arrival'",
    "'memory-ready': { id: 'memory-ready'",
    "'replay-commit': { id: 'replay-commit'",
  ]) has(hapticRegistry, marker)
  for (const marker of [
    "request?.destination === 'infrastructure-hub'",
    "request?.href?.startsWith('/ground')",
    "executeHapticCue('ground-arrival')",
  ]) has(hapticRuntime, marker)
  assert.doesNotMatch(hapticRuntime, /if \(isGroundTravel\(request\)\)[\s\S]{0,220}executeHapticCue\('portal-open'\)/)
})
