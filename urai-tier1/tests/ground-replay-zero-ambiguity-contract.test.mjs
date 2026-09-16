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
const groundCanon = read('src/spatial/ground/groundCanon.ts')
const groundOrb = read('src/spatial/ground/GroundOrbCompanion.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const replayDrawer = read('src/app/replay/ReplayEvidenceDrawer.tsx')
const memory = read('src/spatial/memory/selectedMemoryContract.ts')
const registry = read('src/spatial/world/destinationRegistry.ts')
const navigation = read('src/spatial/navigation/EmbodiedNavigation.tsx')

test('Ground ships as first-person presence with locked human locomotion rather than an FPS body', () => {
  for (const marker of [
    'GROUND_EYE_HEIGHT_M = 1.69',
    'GROUND_DESKTOP_SPEED_MPS = 2.0',
    'GROUND_MOBILE_SPEED_MPS = 1.8',
    'GROUND_VR_SPEED_MPS = 1.6',
    'GROUND_PRECISION_SPEED_MPS = 1.15',
    'GROUND_ACCELERATION_MPS2 = 6.5',
    'GROUND_DECELERATION_MPS2 = 8.0',
    'GROUND_ARRIVAL_RADIUS_M = 0.32',
    'GROUND_PLAYER_RADIUS_M = 0.28',
  ]) has(groundCanon, marker)
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

test('Ground collision and slope policy are explicit and terrain-aligned', () => {
  for (const marker of [
    "if (degrees <= 18) return 1",
    "if (degrees <= 28)",
    "if (degrees <= 36)",
    "return 0",
    "profile === 'arid'",
    "profile === 'coastal'",
    "treeObstacles",
    "rockObstacles",
  ]) has(groundCanon, marker)
  has(ground, 'data-ground-collision="terrain-plus-authored-obstacle-field"')
})

test('Ground owns exactly one physical companion Orb contract and rejects mascot motion language', () => {
  for (const marker of [
    'widthM: 0.48',
    'centerHeightM: 0.8',
    'preferredDistanceM: 2.4',
    'catchupDistanceM: 4.5',
    'decisionHz: 3',
    'normalSpeedMps: 1.1',
    'catchupSpeedMps: 2.3',
    'accelerationMps2: 3.8',
    'followDelayMs: 700',
    'idleVerticalM: 0.008',
    'breathScale: 0.008',
  ]) has(groundCanon, marker)
  for (const marker of ['ground-physical-orb', 'single-ground-world-orb', 'mascotBehavior: false', 'urai:ground-orb-visual-ready']) has(groundOrb, marker)
  has(ground, '<GroundOrbCompanion')
  assert.doesNotMatch(groundOrb, /bounce|hop|nod|eye-like/i)
})

test('Ground weather renderer contract uses normalized physical dimensions rather than emotional clichés', () => {
  for (const marker of [
    'skyLuminance', 'directWarmth', 'ambientCoolness', 'cloudCoverage', 'horizonClarity',
    'windMean', 'windVariance', 'atmosphericDensity', 'movementEnergy', 'shadowDefinition', 'orbCoherence',
    'THREE.MathUtils.clamp(next[key], 0, 1)',
  ]) has(groundCanon, marker)
  assert.doesNotMatch(groundCanon, /sad\s*=\s*rain|happy\s*=\s*sun|angry\s*=\s*red|fear\s*=\s*lightning/i)
})

test('Replay truth model is categorical, provenance-aware and backward compatible without four-phase lock-in', () => {
  for (const marker of [
    "'CAPTURED'", "'DERIVED'", "'SUPPORTED_RECONSTRUCTION'", "'SYMBOLIC'", "'UNKNOWN'",
    "'captured-event'", "'gap'", "'derived-context'", "'reflection'", "'symbolic-bridge'",
    'presentationAllowed: boolean', 'derivedFrom: string[]', 'userConfirmed: boolean',
    "sourceKind === 'generated' && evidenceClass !== 'SUPPORTED_RECONSTRUCTION' && evidenceClass !== 'SYMBOLIC'",
    'replaySegments.length < 1',
  ]) has(memory, marker)
  assert.doesNotMatch(memory, /replaySegments\.length !== CANONICAL_REPLAY_PHASES\.length/)
})

test('Replay is quiet by default and exposes owner operations only through intentional evidence mode', () => {
  for (const marker of [
    "type ReplayUiMode = 'REPLAY_UI_CINEMATIC' | 'REPLAY_UI_CONTROLS' | 'REPLAY_UI_EVIDENCE' | 'REPLAY_COMPLETED'",
    "useState<ReplayUiMode>('REPLAY_UI_CINEMATIC')",
    'REPLAY_CONTROLS_HIDE_MS = 3000',
    "useState(false)",
    "data-replay-ui-mode={uiMode}",
    "data-active-evidence-class={active?.evidenceClass ?? 'UNKNOWN'}",
    "uiMode === 'REPLAY_UI_EVIDENCE' ? <ReplayEvidenceDrawer",
    "uiMode === 'REPLAY_COMPLETED'",
  ]) has(replay, marker)
  for (const marker of ['width:400px', 'max-height:70svh', '<ReplayProductControls memory={memory} />', 'Truth relationship', 'Sources', 'Privacy']) has(replayDrawer, marker)
  assert.equal((replay.match(/<ReplayProductControls/g) ?? []).length, 0)
})

test('Replay source failure preserves the world instead of rendering broken media as truth', () => {
  for (const marker of ['data-replay-source-status', "'unavailable'", 'sourceUnavailable', "setSourceUnavailable(true)"]) has(replay, marker)
  assert.doesNotMatch(replay, /replay-film-portal[^']*visible|flying-photo|energy-burst/i)
})

test('public destination semantics remove stale avatar and Theater authority while retaining compatibility aliases', () => {
  for (const marker of [
    "entryAnchor: string",
    "environmentalForm: 'first-person-living-world'",
    "label: 'Replay'",
    "environmentalForm: 'spatial-temporal-memory-reconstruction'",
    "id: 'infrastructure-hub'",
    "label: 'Ground'",
  ]) has(registry, marker)
  assert.doesNotMatch(registry, /sky-ground-avatar-orb|Replay Theater|cinematic-memory-theater/)
})
