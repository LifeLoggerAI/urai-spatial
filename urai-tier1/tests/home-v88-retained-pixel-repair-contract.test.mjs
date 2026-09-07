import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const telemetry = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const proof = readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
const naturalProof = readFileSync(new URL('../../scripts/run-continuous-spatial-proof-v22-natural.mjs', import.meta.url), 'utf8')
const finalizer = readFileSync(new URL('../../.github/workflows/home-finalization-candidate-commit.yml', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V185 terrain is one continuous camera-safe authority with soft strata and no road or detached shelf family', () => {
  for (const marker of ['function SculptedCanyonGround(','home-v125-sculpted-canyon-ground','continuous-weathered-canyon-camera-safe-destination-basins-soft-strata-no-contour-staircase','function SanctuaryTerraces(','home-v126-continuous-walkable-terrace-network']) has(art, marker)
  assert.match(art, /const groundCameraBasin = Math\.exp/)
  assert.match(art, /const lifeCameraBasin = Math\.exp/)
  assert.match(art, /const cameraSafeCarve = groundCameraBasin\*1\.42 \+ lifeCameraBasin\*1\.50/)
  assert.match(art, /const terraceHeight = 0\.14/)
  assert.match(art, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
})

test('V185 destinations stay terrain-bound and readable from the real nearby camera without rejected portal geometry', () => {
  for (const marker of ['function FramedFissure(','home-v126-${side}-framed-fissure','terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring','camera-safe-basin-wide-ground-level-signal-place-no-upright-gate','home-v175-${side}-terrain-signal-veins']) has(art, marker)
  assert.match(art, /position=\{\[x,isGround\?0\.70:0\.64,isGround\?-8\.72:-8\.78\]\}/)
  assert.match(art, /home-v151-\$\{side\}-retained-stone-provenance[^>]*visible=\{false\}/)
  assert.match(art, /home-v153-\$\{side\}-retired-threshold-panel[^>]*visible=\{false\}/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
})

test('V185 Orb remains aligned to exact proximity authority and is a large point-memory presence without a solid seed', () => {
  for (const marker of ['function LivingOrb(','home-v126-orb-memory-motes','home-v154-orb-memory-depth-motes','home-v174-orb-memory-nucleus-motes','home-v179-orb-memory-heart-motes','large-contained-point-memory-presence-dense-dark-heart-no-solid-ball-no-fountain']) has(art, marker)
  assert.match(art, /name="home-v126-apse-integrated-orb"[^>]*scale=\{\[1\.72,1\.72,1\.72\]\}/)
  assert.match(art, /name="home-v182-orb-faceted-mineral-seed"[^>]*visible=\{false\}/)
  assert.match(runtime, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(telemetry, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
  assert.match(proof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
  assert.match(naturalProof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
})

test('V185 keeps world-space atmosphere and reduced-motion-safe visual ownership', () => {
  has(art, 'home-v183-world-space-memory-sky')
  has(art, 'deep-teal-memory-sky-preserves-night-without-dead-black-field-or-flat-veil')
  has(art, 'four-low-bounded-world-space-memory-weather-fields-localize-ground-life-map-and-deep-basin-no-upright-gates')
  assert.doesNotMatch(art, /AncestralMemoryVeils|home-v183-ancestral-memory-weather-veils/)
})

test('V185 preserves exact proximity and travel gates in the unchanged V70 owner', () => {
  assert.match(runtime, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(runtime, /const inspectionClearance = nearby === 'orb'/)
  assert.match(runtime, /destination: 'infrastructure-hub'/)
  assert.match(runtime, /destination: 'life-map'/)
})

test('V185 remains explicitly uncertified until literal exact-head retained pixels pass', () => {
  assert.match(finalizer, /home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /embodied-exploration-contract\.test\.mjs/)
  has(telemetry, "data-home-v126-certification', 'retained-pixel-candidate-not-certified")
  has(telemetry, "data-home-art-certification', 'v126-retained-pixels-pending-not-certified")
  assert.doesNotMatch(`${runtime}\n${art}\n${telemetry}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})