import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const currentRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const currentGeometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
const legacyRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const legacyArt = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V225 is the single authoritative Home Canvas while predecessor art remains historical provenance', () => {
  has(currentRuntime, 'export function HomeWorldProductionV223')
  has(currentRuntime, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(owner, 'data-home-canvas-owner="home-world-production-v225-direct-runtime-single-authority"')
  has(owner, "'data-home-v126-art-layer','historical-unmounted-source-authority'")
  has(owner, "'data-home-v126-certification','superseded-rejected-pixels'")
  has(owner, "'data-home-v223-art-layer','historical-unmounted-source-authority'")
  has(owner, "'data-home-v223-certification','superseded-rejected-pixels'")
  has(owner, "'data-home-v224-art-layer','superseded-rejected-pixels'")
  has(owner, "'data-home-v224-certification','superseded-rejected-pixels'")
  has(owner, 'data-home-v225-retained-pixel-rebuild="active"')
  assert.equal((currentRuntime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(currentGeometry, /<Canvas/)
  assert.match(legacyRuntime, /export function HomeWorldProductionV70/)
  assert.match(legacyArt, /export function HomeV76Sanctuary/)
})

test('V225 visible world uses continuous sculpted terrain, weathered strata and distinct embedded destinations', () => {
  for (const marker of [
    'function sculptedFloorGeometry(',
    'function strataGeometry(',
    'function memoryRib(',
    'home-v225-sculpted-sanctuary-floor',
    'home-v225-authored-memory-valley',
    'export function Escarpment(',
    'home-v225-ground-sheltered-memory-basin',
    'home-v225-life-map-rooted-memory-observatory',
    'home-v225-life-map-braided-lineage-vault',
    'export function DestinationLights()',
  ]) has(currentGeometry, marker)
  assert.match(currentGeometry, /BufferGeometry/)
  assert.match(currentGeometry, /computeVertexNormals\(\)/)
  assert.match(currentGeometry, /normalMap=\{maps\[1\]\}/)
  assert.match(currentGeometry, /roughnessMap=\{maps\[2\]\}/)
  assert.doesNotMatch(currentGeometry, /<torusGeometry|<RoundedBox|useGLTF\(|IcosahedronGeometry/)
})

test('V225 Orb is one integrated asymmetric living-memory presence with governed states and embedded veins', () => {
  has(currentGeometry, 'function livingMemoryGeometry(')
  has(currentGeometry, 'home-v225-single-asymmetric-living-memory-presence')
  has(currentGeometry, 'home-v225-single-connected-folded-living-memory-mantle')
  has(currentGeometry, 'home-v225-embedded-memory-veins')
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) has(currentGeometry, `${state}:`)
  assert.match(currentGeometry, /export const ORB\s*=\s*new THREE\.Vector3\(-\.45,\s*1\.03,\s*-7\.45\)/)
  assert.match(owner, /HOME_ORB=\{x:-\.45,z:-7\.45\}/)
  assert.match(currentRuntime, /data-home-orb-state=\{orbState\}/)
  assert.match(currentRuntime, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState,reducedMotion,true\)\.animation\}/)
  assert.match(currentGeometry, /new THREE\.TubeGeometry\(/)
  assert.doesNotMatch(currentGeometry, /octahedronGeometry|IcosahedronGeometry/)
})

test('V225 keeps bounded rendering, real traversal and fail-closed pixel certification', () => {
  assert.match(currentRuntime, /dpr=\{1\}/)
  assert.match(currentRuntime, /cameraCheckpoint:'home-ground-descent'/)
  assert.match(currentRuntime, /cameraCheckpoint:'home-sky-ascent-complete'/)
  assert.match(currentRuntime, /reducedMotion\?720:1800/)
  has(owner, "'data-home-v225-certification','fresh-exact-head-pixels-required'")
  has(owner, "'data-home-art-certification','fresh-exact-head-pixels-required'")
  has(owner, "'data-home-final-art-revision','v225-retained-pixels-pending'")
  assert.doesNotMatch(`${currentRuntime}\n${currentGeometry}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
