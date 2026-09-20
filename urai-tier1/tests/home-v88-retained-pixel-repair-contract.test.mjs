import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const historicalArt = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const historicalRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const currentRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const currentGeometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
const telemetry = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))
const visualAuthority = readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const groundedOrb = readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const reliquary = readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const finalizer = readFileSync(new URL('../../.github/workflows/home-finalization-candidate-commit.yml', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('historical V185 terrain regression remains preserved without current ownership', () => {
  for (const marker of ['function SculptedCanyonGround(','home-v125-sculpted-canyon-ground','continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase','function SanctuaryTerraces(','home-v126-continuous-walkable-terrace-network']) has(historicalArt, marker)
  assert.match(historicalArt, /const groundCameraBasin = Math\.exp/)
  assert.match(historicalArt, /const lifeCameraBasin = Math\.exp/)
  assert.match(historicalArt, /const cameraSafeCarve = groundCameraBasin\*1\.42 \+ lifeCameraBasin\*1\.50/)
  assert.match(historicalArt, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(historicalArt, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
})

test('historical V185 destinations remain regression-covered and visibly retired', () => {
  for (const marker of ['function FramedFissure(','home-v126-${side}-framed-fissure','terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring','camera-safe-basin-wide-ground-level-signal-place-no-upright-gate','home-v175-${side}-terrain-signal-veins']) has(historicalArt, marker)
  assert.match(historicalArt, /home-v151-\$\{side\}-retained-stone-provenance[^>]*visible=\{false\}/)
  assert.match(historicalArt, /home-v153-\$\{side\}-retired-threshold-panel[^>]*visible=\{false\}/)
  assert.doesNotMatch(historicalArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
})

test('V288 remains certified predecessor provenance while V292 Home carries the V291 authored Orb candidate fail-closed', () => {
  assert.equal(authority.artRevision, 'v292-avatar-presentation-bodyless-first-person-convergence')
  assert.equal(authority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.ok(authority.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbGroundedV288.tsx'))
  assert.equal(authority.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(authority.currentRuntimeCandidate.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.doesNotMatch(visualAuthority, /HomeOrbGroundedV288|<HomeOrbGroundedV288/)
  assert.match(visualAuthority, /return null/)
  has(currentRuntime, 'home-orb-reference-glass-shell')
  has(currentRuntime, 'home-orb-luminous-inner-volume')
  has(currentRuntime, 'home-orb-memory-bloom-core')
  has(currentRuntime, 'home-orb-memory-motes')
  assert.doesNotMatch(currentRuntime, /home-orb-stabilizer-ring|home-orb-crystalline-fragments|<torusGeometry|<tetrahedronGeometry/)
  for (const marker of ['v288-grounded-biomorphic-memory-reliquary','HomeOrbReliquaryV286','home-gold-companion','fallbackVisualOwner: false','interactionOwner: true','interactionOwner: false']) has(groundedOrb, marker)
  for (const marker of ['home-v286-biomorphic-memory-reliquary','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field']) has(reliquary, marker)
  assert.match(currentGeometry, /export const ORB\s*=\s*new THREE\.Vector3\(-\.45,\s*1\.03,\s*-7\.45\)/)
  assert.doesNotMatch(telemetry, /const HOME_ORB = \{ x: -\.45, z: -7\.45 \} as const/)
  assert.doesNotMatch(currentRuntime, /nearby\s*={2,3}\s*['"]orb['"]|distanceTo\(ORB\)|distance-orb/)
})

test('historical V185 world-space atmosphere and reduced-motion regression remain preserved', () => {
  has(historicalArt, 'home-v183-world-space-memory-sky')
  has(historicalArt, 'deep-teal-memory-sky-preserves-night-without-dead-black-field-or-flat-veil')
  has(historicalArt, 'four-low-bounded-world-space-memory-weather-fields-localize-ground-life-map-and-deep-basin-no-upright-gates')
  assert.doesNotMatch(historicalArt, /AncestralMemoryVeils|home-v183-ancestral-memory-weather-veils/)
})

test('historical V185 traversal gates remain regression-covered without claiming current authority', () => {
  assert.match(historicalRuntime, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(historicalRuntime, /const inspectionClearance = nearby === 'orb'/)
  assert.match(historicalRuntime, /destination: 'infrastructure-hub'/)
  assert.match(historicalRuntime, /destination: 'life-map'/)
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
  assert.doesNotMatch(`${currentRuntime}\n${historicalRuntime}\n${historicalArt}\n${currentGeometry}\n${telemetry}\n${groundedOrb}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
