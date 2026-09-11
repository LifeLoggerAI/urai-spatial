import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const currentRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const currentGeometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
const currentVisual = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV225PolishV3.tsx', import.meta.url), 'utf8')
const historicalV225 = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV225PolishV2.tsx', import.meta.url), 'utf8')
const legacyRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const legacyArt = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V226 is the single authoritative Home visual owner while predecessor art remains historical provenance', () => {
  has(currentRuntime, 'export function HomeWorldProductionV223')
  has(currentRuntime, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(currentRuntime, 'HomeV225PolishV3')
  has(owner, 'data-home-canvas-owner="home-world-production-v223-movement-v226-visual-single-authority"')
  has(owner, "for (const version of ['76','125','126','176','219','220','221','222','223','224','225'])")
  has(owner, "world.setAttribute('data-home-v225-art-layer', 'superseded-v3-visual-owner')")
  has(owner, "world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')")
  has(owner, 'data-home-v226-retained-pixel-rebuild="active"')
  has(owner, 'data-home-v225-retained-pixel-rebuild="superseded"')
  assert.equal((currentRuntime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(currentGeometry, /<Canvas/)
  assert.doesNotMatch(currentVisual, /<Canvas/)
  assert.match(legacyRuntime, /export function HomeWorldProductionV70/)
  assert.match(legacyArt, /export function HomeV76Sanctuary/)
})

test('V225 base geometry remains covered beneath the V226 rooted sanctuary successor', () => {
  for (const marker of [
    'function sculptedFloorGeometry(', 'function strataGeometry(', 'function memoryRib(',
    'home-v225-sculpted-sanctuary-floor', 'home-v225-authored-memory-valley', 'export function Escarpment(',
    'home-v225-ground-sheltered-memory-basin', 'home-v225-life-map-rooted-memory-observatory',
    'home-v225-life-map-braided-lineage-vault', 'export function DestinationLights()',
  ]) has(currentGeometry, marker)
  for (const marker of ['home-v225-v2-continuous-sculpted-memory-valley','home-v225-v2-authored-valley-floor','home-v225-v2-grown-memory-walk']) has(historicalV225, marker)
  assert.match(currentGeometry, /BufferGeometry/)
  assert.match(currentGeometry, /computeVertexNormals\(\)/)
  assert.match(currentGeometry, /normalMap=\{maps\[1\]\}/)
  assert.match(currentGeometry, /roughnessMap=\{maps\[2\]\}/)
  assert.doesNotMatch(currentGeometry, /<torusGeometry|<RoundedBox|useGLTF\(|IcosahedronGeometry/)
})

test('V226 Orb is one integrated asymmetric living-memory presence with governed states and embedded veins', () => {
  for (const marker of ['function organicOrbGeometry(', 'function LivingMemoryPresence(', 'home-v226-rooted-single-living-memory-presence', 'function vein(']) has(currentVisual, marker)
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) has(currentVisual, `${state}:`)
  assert.match(currentGeometry, /export const ORB\s*=\s*new THREE\.Vector3\(-\.45,\s*1\.03,\s*-5\.35\)/)
  assert.match(owner, /const HOME_ORB = \{ x: -\.45, z: -7\.45 \} as const/)
  assert.match(currentRuntime, /data-home-orb-state=\{orbState\}/)
  assert.match(currentRuntime, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState,reducedMotion,true\)\.animation\}/)
  assert.match(currentVisual, /new THREE\.TubeGeometry\(/)
  assert.doesNotMatch(currentVisual, /octahedronGeometry|IcosahedronGeometry|<torusGeometry/)
})

test('V226 keeps bounded rendering, real traversal and fail-closed pixel certification', () => {
  assert.match(currentRuntime, /dpr=\{1\}/)
  assert.match(currentRuntime, /cameraCheckpoint:'home-ground-descent'/)
  assert.match(currentRuntime, /cameraCheckpoint:'home-sky-ascent-complete'/)
  assert.match(currentRuntime, /reducedMotion\?720:1800/)
  has(owner, "world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')")
  has(owner, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
  has(owner, "world.setAttribute('data-home-final-art-revision', 'v226-retained-pixels-pending')")
  assert.doesNotMatch(`${currentRuntime}\n${currentGeometry}\n${currentVisual}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
