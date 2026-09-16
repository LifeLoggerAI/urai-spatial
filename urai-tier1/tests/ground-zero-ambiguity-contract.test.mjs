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
const orb = read('src/spatial/ground/GroundOrbCompanion.tsx')
const navigation = read('src/spatial/navigation/EmbodiedNavigation.tsx')
const hapticRegistry = read('src/spatial/haptics/hapticCueRegistry.ts')
const hapticRuntime = read('src/spatial/haptics/HapticRuntime.tsx')

test('Ground locked locomotion is human-scale first-person presence', () => {
  for (const marker of [
    'GROUND_EYE_HEIGHT_M = 1.69',
    'GROUND_LANDSCAPE_FOV_DEG = 58',
    'GROUND_PORTRAIT_FOV_DEG = 66',
    'GROUND_NEAR_PLANE_M = 0.08',
    'GROUND_DESKTOP_SPEED_MPS = 2.0',
    'GROUND_MOBILE_SPEED_MPS = 1.8',
    'GROUND_VR_SPEED_MPS = 1.6',
    'GROUND_PRECISION_SPEED_MPS = 1.15',
    'GROUND_ACCELERATION_MPS2 = 6.5',
    'GROUND_DECELERATION_MPS2 = 8.0',
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

test('Ground slope and obstacle policy are encoded as production behavior', () => {
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
  has(ground, 'data-ground-collision="terrain-plus-authored-obstacle-field"')
  has(ground, 'slopeDegrees(')
  has(ground, 'slopeSpeedMultiplier(')
})

test('physical Ground Orb owns pointer activation and fixed Orb is accessibility fallback', () => {
  for (const marker of [
    'widthM: 0.48',
    'centerHeightM: 0.8',
    'preferredDistanceM: 2.4',
    'minimumDistanceM: 1.25',
    'maximumIdleDistanceM: 4.0',
    'catchupDistanceM: 4.5',
    'preferredBearingDeg: 30',
    'centerExclusionDeg: 8',
    'decisionHz: 3',
    'normalSpeedMps: 1.1',
    'catchupSpeedMps: 2.3',
    'accelerationMps2: 3.8',
    'followDelayMs: 700',
    'idleVerticalM: 0.008',
    'breathScale: 0.008',
  ]) has(canon, marker)
  for (const marker of [
    'ground-physical-orb',
    'single-ground-world-orb',
    'canonicalWidthM: GROUND_ORB.widthM',
    'mascotBehavior: false',
    'requestUraiWorldOrbOpen()',
    "requestHapticCue('orb-attention', 'ground-physical-orb')",
    "fallback.dataset.physicalGroundOrbFallback = 'true'",
    "fallback.style.opacity = '0'",
    "fallback.addEventListener('focus', reveal)",
  ]) has(orb, marker)
  has(ground, '<GroundOrbCompanion')
  assert.doesNotMatch(orb, /\bbounce\b|\bhop\b|\bnod\b|eye-like/i)
})

test('Ground atmosphere is parameterized physically rather than by emotion labels', () => {
  for (const marker of [
    'skyLuminance', 'directWarmth', 'ambientCoolness', 'cloudCoverage', 'horizonClarity',
    'windMean', 'windVariance', 'atmosphericDensity', 'movementEnergy', 'shadowDefinition', 'orbCoherence',
    'THREE.MathUtils.clamp(next[key], 0, 1)',
  ]) has(canon, marker)
  assert.doesNotMatch(canon, /sad\s*=\s*rain|happy\s*=\s*sun|angry\s*=\s*red|fear\s*=\s*lightning/i)
})

test('Ground keeps scanned material ownership, wide visual depth and accessible mobile fallback', () => {
  for (const marker of [
    'DistantGroundContinuation',
    'perceivedRangeMeters: 400',
    'far: 800',
    'GroundAnalogPad',
    'max = 38',
    '< 0.14 ? 0',
    '<MobileMovementPad',
    'ACESFilmicToneMapping',
    'toneMappingExposure = 0.96',
  ]) has(ground, marker)
})

test('Ground haptics use exact semantic pulses and never reuse portal-open for the physical Ground handoff', () => {
  for (const marker of [
    "'ground-activation': { id: 'ground-activation', label: 'Ground Activation', patternMs: [12]",
    "'ground-arrival': { id: 'ground-arrival', label: 'Ground Arrival', patternMs: [24]",
    "'orb-attention': { id: 'orb-attention', label: 'Orb Attention', patternMs: [10]",
    "'memory-ready': { id: 'memory-ready', label: 'Memory Ready', patternMs: [18, 90, 8]",
    "'replay-commit': { id: 'replay-commit', label: 'Replay Commit', patternMs: [22]",
  ]) has(hapticRegistry, marker)
  for (const marker of [
    "request?.destination === 'infrastructure-hub'",
    "request?.href?.startsWith('/ground')",
    "executeHapticCue('ground-arrival')",
    '}, 220)',
  ]) has(hapticRuntime, marker)
  assert.doesNotMatch(hapticRuntime, /if \(isGroundTravel\(request\)\)[\s\S]{0,220}executeHapticCue\('portal-open'\)/)
})
