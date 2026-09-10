import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const historicalArt = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const historicalRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const currentGeometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
const telemetry = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const proof = readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
const naturalProof = readFileSync(new URL('../../scripts/run-continuous-spatial-proof-v22-natural.mjs', import.meta.url), 'utf8')
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

test('V226 Orb proximity authority aligns runtime geometry, telemetry, and active proof translation', () => {
  assert.match(currentGeometry, /export const ORB\s*=\s*new THREE\.Vector3\(-\.45,\s*1\.03,\s*-7\.45\)/)
  assert.match(telemetry, /HOME_ORB=\{x:-\.45,z:-7\.45\}/)
  assert.match(naturalProof, /const historicalOrb = "orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35"/)
  assert.match(naturalProof, /const currentOrb = "orb: \{ x: -0\.45, z: -7\.45, radius: 2\.35"/)
  assert.match(naturalProof, /patched = replaceOnce\(patched, historicalOrb, currentOrb, 'Orb telemetry'\)/)
  assert.match(naturalProof, /const currentOwner = "result\.animationOwner === 'v226-rooted-living-memory-presence'"/)
  assert.match(proof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
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
})

test('V226 remains explicitly uncertified until literal exact-head retained pixels pass', () => {
  assert.match(finalizer, /home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /embodied-exploration-contract\.test\.mjs/)
  has(telemetry, "for (const version of ['76','125','126','176','219','220','221','222','223','224','225'])")
  has(telemetry, "world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')")
  has(telemetry, "world.setAttribute('data-home-v225-art-layer', 'superseded-v3-visual-owner')")
  has(telemetry, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
  has(telemetry, 'data-home-v226-retained-pixel-rebuild="active"')
  has(telemetry, 'data-home-v225-retained-pixel-rebuild="superseded"')
  assert.doesNotMatch(`${historicalRuntime}\n${historicalArt}\n${currentGeometry}\n${telemetry}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
