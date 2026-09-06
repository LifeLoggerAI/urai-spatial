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

test('V126 terrain is continuous generated geometry with a readable authored path', () => {
  has(art, 'function SculptedCanyonGround(')
  has(art, 'home-v125-sculpted-canyon-ground')
  has(art, 'function SanctuaryTerraces(')
  has(art, 'home-v126-continuous-walkable-terrace-network')
  assert.match(art, /setAttribute\('position', new THREE\.Float32BufferAttribute\(positions, 3\)\)/)
  assert.match(art, /computeVertexNormals\(\)/)
  assert.doesNotMatch(art, /terraces\.map|home-v76-continuous-stone-floor|TerracedGround/)
})

test('V165 thresholds are terrain-flush irregular destination cuts without the rejected shelf or portal families', () => {
  has(art, 'function FramedFissure(')
  has(art, 'home-v126-${side}-framed-fissure')
  has(art, 'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring')
  has(art, 'scan-provenance-pushed-beyond-clear-navigation-corridors-no-card-slabs')
  assert.match(art, /scale=\{isGround \? \[0\.38, 0\.58, 0\.34\] : \[0\.37, 0\.59, 0\.34\]\}/)
  assert.doesNotMatch(art, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
})

test('V126 Orb hierarchy stays aligned with live proximity and proof telemetry', () => {
  has(art, 'function LivingOrb(')
  has(art, 'home-v126-orb-memory-motes')
  has(art, 'home-v126-layered-apse-orb-cradle')
  has(art, "object.name.startsWith('orb-orbit-')")
  assert.match(runtime, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(telemetry, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
  assert.match(proof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
  assert.match(naturalProof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
})

test('V126 preserves exact proximity and travel gates in the unchanged V70 owner', () => {
  assert.match(runtime, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(runtime, /const inspectionClearance = nearby === 'orb'/)
  assert.match(runtime, /destination: 'infrastructure-hub'/)
  assert.match(runtime, /destination: 'life-map'/)
})

test('V126 finalization executes current contracts and remains explicitly uncertified pending pixels', () => {
  assert.match(finalizer, /home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /embodied-exploration-contract\.test\.mjs/)
  has(telemetry, "data-home-v126-certification', 'retained-pixel-candidate-not-certified")
  has(telemetry, "data-home-art-certification', 'v126-retained-pixels-pending-not-certified")
  assert.doesNotMatch(`${runtime}\n${art}\n${telemetry}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
