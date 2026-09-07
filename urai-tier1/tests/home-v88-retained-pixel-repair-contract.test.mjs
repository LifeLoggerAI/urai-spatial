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

test('V175 terrain remains one continuous generated authority with visible terraced erosion and no road or detached shelf family', () => {
  has(art, 'function SculptedCanyonGround(')
  has(art, 'home-v125-sculpted-canyon-ground')
  has(art, 'function SanctuaryTerraces(')
  has(art, 'home-v126-continuous-walkable-terrace-network')
  has(art, 'terraced-erosion-canyon-visible-strata-raised-far-rim-detailed-foreground-no-smooth-bowl')
  assert.match(art, /const terraceHeight = 0\.32/)
  assert.match(art, /const terracedHeight = Math\.floor/)
  assert.match(art, /const erosionRills =/)
  assert.match(art, /setAttribute\('position', new THREE\.Float32BufferAttribute\(positions, 3\)\)/)
  assert.match(art, /computeVertexNormals\(\)/)
  assert.match(art, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(art, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
  assert.doesNotMatch(art, /terraces\.map|home-v76-continuous-stone-floor|TerracedGround/)
})

test('V175 destinations are terrain-bound branching basin signal fields and the old slab geometry is non-rendered', () => {
  has(art, 'function FramedFissure(')
  has(art, 'home-v126-${side}-framed-fissure')
  has(art, 'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring')
  has(art, 'scan-provenance-pushed-beyond-clear-navigation-corridors-no-card-slabs')
  has(art, 'basin-wide-branching-signal-field-no-slab-no-door-no-ring')
  has(art, 'home-v175-${side}-terrain-signal-veins')
  assert.match(art, /position=\{\[x,isGround\?0\.93:0\.89,isGround\?-9\.72:-9\.80\]\}/)
  assert.match(art, /home-v151-\$\{side\}-retained-stone-provenance[^>]*visible=\{false\}/)
  assert.match(art, /home-v153-\$\{side\}-retired-threshold-panel[^>]*visible=\{false\}/)
  assert.doesNotMatch(art, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
})

test('V175 Orb hierarchy stays aligned with live proximity while remaining a dense horizontal living swarm', () => {
  has(art, 'function LivingOrb(')
  has(art, 'home-v126-orb-memory-motes')
  has(art, 'home-v174-orb-memory-nucleus-motes')
  has(art, 'home-v175-orb-memory-heart-motes')
  has(art, 'home-v126-layered-apse-orb-cradle')
  has(art, "object.name.startsWith('orb-orbit-')")
  has(art, 'dense-horizontal-living-memory-cloud-with-compact-multi-depth-heart-no-fountain-no-ball')
  assert.match(runtime, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(telemetry, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
  assert.match(proof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
  assert.match(naturalProof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
})

test('V175 preserves exact proximity and travel gates in the unchanged V70 owner', () => {
  assert.match(runtime, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(runtime, /const inspectionClearance = nearby === 'orb'/)
  assert.match(runtime, /destination: 'infrastructure-hub'/)
  assert.match(runtime, /destination: 'life-map'/)
})

test('V175 finalization executes current contracts and remains explicitly uncertified pending literal pixels', () => {
  assert.match(finalizer, /home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /embodied-exploration-contract\.test\.mjs/)
  has(telemetry, "data-home-v126-certification', 'retained-pixel-candidate-not-certified")
  has(telemetry, "data-home-art-certification', 'v126-retained-pixels-pending-not-certified")
  assert.doesNotMatch(`${runtime}\n${art}\n${telemetry}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})