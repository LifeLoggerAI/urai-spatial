import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const currentRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const currentGeometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
const telemetry = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))
const visualAuthority = readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const groundedOrb = readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const reliquary = readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const finalizer = readFileSync(new URL('../../.github/workflows/home-finalization-candidate-commit.yml', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('retired V185 terrain and destination implementations do not re-enter current Home authority', () => {
  for (const marker of [
    'function SculptedCanyonGround(',
    'home-v125-sculpted-canyon-ground',
    'continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase',
    'function SanctuaryTerraces(',
    'home-v126-continuous-walkable-terrace-network',
    'function FramedFissure(',
    'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',
    'camera-safe-basin-wide-ground-level-signal-place-no-upright-gate',
    'home-v175-',
    'home-v154-inlaid-stone-approach',
    'home-v131-passive-signal-arrival-path',
  ]) {
    assert.equal(currentRuntime.includes(marker), false, `retired Home marker re-entered current runtime: ${marker}`)
  }
})

test('V288 certified morphology is restored while V291 interaction semantics remain fail-closed pending current-head pixels', () => {
  assert.equal(authority.artRevision, 'v293-direct-bodyless-first-person-convergence')
  assert.equal(authority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.ok(authority.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbGroundedV288.tsx'))
  assert.equal(authority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(authority.currentRuntimeCandidate.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(authority.currentRuntimeCandidate.orbInteractionAuthority, 'v291-current-home-orb-state-and-speech-runtime')
  assert.equal(authority.currentRuntimeCandidate.homePresentationAuthority, 'direct-bodyless-first-person')
  assert.equal(authority.currentRuntimeCandidate.nonXrFirstPersonBodyPolicy, 'camera-only-no-hands-arms-visible-avatar-or-body-rig')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.match(visualAuthority, /HomeOrbGroundedV288/)
  assert.match(visualAuthority, /return <HomeOrbGroundedV288 \/>/)
  assert.match(currentRuntime, /<HomeVisualAuthority \/>/)
  has(currentRuntime, 'home-orb-reference-glass-shell')
  has(currentRuntime, 'home-orb-luminous-inner-volume')
  has(currentRuntime, 'home-orb-memory-bloom-core')
  has(currentRuntime, 'home-orb-memory-motes')
  assert.doesNotMatch(currentRuntime, /home-orb-stabilizer-ring|home-orb-crystalline-fragments|name=["'][^"']*home-orb[^"']*["'][\s\S]{0,800}<torusGeometry|name=["'][^"']*home-orb[^"']*["'][\s\S]{0,800}<tetrahedronGeometry/)
  for (const marker of ['v288-grounded-biomorphic-memory-reliquary','HomeOrbReliquaryV286','home-gold-companion','fallbackVisualOwner: false','interactionOwner: true','interactionOwner: false']) has(groundedOrb, marker)
  for (const marker of ['home-v286-biomorphic-memory-reliquary','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field']) has(reliquary, marker)
  assert.match(currentGeometry, /export const ORB\s*=\s*new THREE\.Vector3\(-\.45,\s*1\.03,\s*-7\.45\)/)
  assert.doesNotMatch(telemetry, /const HOME_ORB = \{ x: -\.45, z: -7\.45 \} as const/)
  assert.doesNotMatch(currentRuntime, /nearby\s*={2,3}\s*['"]orb['"]|distanceTo\(ORB\)|distance-orb/)
})

test('retired V185 atmosphere implementation does not re-enter current Home authority', () => {
  for (const marker of [
    'home-v183-world-space-memory-sky',
    'deep-teal-memory-sky-preserves-night-without-dead-black-field-or-flat-veil',
    'four-low-bounded-world-space-memory-weather-fields-localize-ground-life-map-and-deep-basin-no-upright-gates',
    'AncestralMemoryVeils',
    'home-v183-ancestral-memory-weather-veils',
  ]) {
    assert.equal(currentRuntime.includes(marker), false, `retired Home atmosphere marker re-entered current runtime: ${marker}`)
  }
})

test('current Home traversal remains regression-covered without restoring retired proximity gates', () => {
  assert.match(currentRuntime, /requestUraiWorldTravel/)
  assert.match(currentRuntime, /destination: 'infrastructure-hub'/)
  assert.match(currentRuntime, /destination: 'life-map'/)
  assert.doesNotMatch(currentRuntime, /\['orb',\s*ORB|\['ground',\s*GROUND|\['life-map',\s*LIFE_MAP/)
})

test('current Home candidate remains explicitly uncertified until literal exact-head retained pixels pass', () => {
  assert.match(finalizer, /home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /embodied-exploration-contract\.test\.mjs/)
  has(telemetry, "world.setAttribute('data-home-v288-certification', 'fresh-exact-head-pixels-required')")
  has(telemetry, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
  has(telemetry, 'data-home-v288-retained-pixel-rebuild="active"')
  has(telemetry, 'data-home-v226-retained-pixel-rebuild="superseded"')
  has(telemetry, 'data-home-v225-retained-pixel-rebuild="superseded"')
  has(currentRuntime, 'data-home-visual-grade="current-literal-pixel-candidate-not-certified"')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.doesNotMatch(`${currentRuntime}\n${currentGeometry}\n${telemetry}\n${groundedOrb}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
