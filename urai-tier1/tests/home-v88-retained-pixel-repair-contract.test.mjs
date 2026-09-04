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

test('V125 terrain is continuous generated geometry and not a tiled slab', () => {
  has(art, 'function SculptedCanyonGround(')
  has(art, 'home-v125-sculpted-canyon-ground')
  assert.match(art, /setAttribute\('position', new THREE\.Float32BufferAttribute\(positions, 3\)\)/)
  assert.match(art, /computeVertexNormals\(\)/)
  assert.doesNotMatch(art, /terraces\.map|home-v76-continuous-stone-floor|TerracedGround/)
})

test('V125 thresholds are natural rock fissures without ring/arch presentation', () => {
  has(art, 'function NaturalFissure(')
  has(art, 'home-v125-${side}-natural-fissure')
  has(art, 'home-v125-${side}-left-bearing-rock')
  has(art, 'home-v125-${side}-right-bearing-rock')
  assert.doesNotMatch(art, /<ringGeometry|PortalStoneFrame|PortalRecess|threshold-lintel/)
})

test('V125 Orb hierarchy stays aligned with live proximity and proof telemetry', () => {
  has(art, 'function LivingOrb(')
  has(art, 'home-v125-orb-memory-motes')
  assert.match(runtime, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(telemetry, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
  assert.match(proof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
  assert.match(naturalProof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
})

test('V125 preserves exact proximity and travel gates in the unchanged V70 owner', () => {
  assert.match(runtime, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(runtime, /const inspectionClearance = nearby === 'orb'/)
  assert.match(runtime, /destination: 'infrastructure-hub'/)
  assert.match(runtime, /destination: 'life-map'/)
})

test('V125 finalization executes current contracts and remains explicitly uncertified pending pixels', () => {
  assert.match(finalizer, /home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /embodied-exploration-contract\.test\.mjs/)
  has(telemetry, "data-home-v125-certification', 'retained-pixel-candidate-not-certified")
  has(telemetry, "data-home-art-certification', 'v125-retained-pixels-pending-not-certified")
  assert.doesNotMatch(`${runtime}\n${art}\n${telemetry}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
