import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const currentRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const currentGeometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
const legacyRuntime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const legacyArt = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V223 is the single authoritative Home Canvas while V70/V126 remain historical provenance', () => {
  has(currentRuntime, 'export function HomeWorldProductionV223')
  has(currentRuntime, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(owner, 'data-home-canvas-owner="home-world-production-v223-single-authority"')
  has(owner, "data-home-v126-art-layer', 'historical-unmounted-source-authority")
  has(owner, "data-home-v126-certification', 'superseded-rejected-pixels")
  assert.equal((currentRuntime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(currentGeometry, /<Canvas/)
  assert.match(legacyRuntime, /export function HomeWorldProductionV70/)
  assert.match(legacyArt, /export function HomeV76Sanctuary/)
})

test('V223 visible world uses continuous weathered terrain and distinct embedded destinations', () => {
  for (const marker of [
    'function terrainGeometry(',
    'home-v223-weathered-valley-floor',
    'export function Escarpment(',
    'home-v223-ground-sheltered-memory-basin',
    'home-v223-life-map-ascending-memory-terraces',
    'export function DestinationLights()',
  ]) has(currentGeometry, marker)
  assert.match(currentGeometry, /BufferGeometry/)
  assert.match(currentGeometry, /computeVertexNormals\(\)/)
  assert.match(currentGeometry, /normalMap=\{m\[1\]\}/)
  assert.match(currentGeometry, /roughnessMap=\{m\[2\]\}/)
  assert.doesNotMatch(currentGeometry, /<ringGeometry|<torusGeometry|<RoundedBox/)
})

test('V223 Orb is one integrated asymmetric living-memory presence with governed states', () => {
  has(currentGeometry, 'function orbGeometry(')
  has(currentGeometry, 'function orbVertex(')
  has(currentGeometry, 'home-v223-open-cavity-living-memory-presence')
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) has(currentGeometry, `${state}:`)
  assert.match(currentGeometry, /export const ORB=new THREE\.Vector3\(-\.45,1\.02,-7\.45\)/)
  assert.match(owner, /const HOME_ORB = \{ x: -0\.45, z: -7\.45 \} as const/)
  assert.match(currentRuntime, /data-home-orb-state=\{orbState\}/)
  assert.match(currentRuntime, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState,reducedMotion,true\)\.animation\}/)
})

test('V223 keeps bounded rendering, real traversal and fail-closed pixel certification', () => {
  assert.match(currentRuntime, /dpr=\{1\}/)
  assert.match(currentRuntime, /cameraCheckpoint:'home-ground-descent'/)
  assert.match(currentRuntime, /cameraCheckpoint:'home-sky-ascent-complete'/)
  assert.match(currentRuntime, /reducedMotion\?720:1800/)
  has(owner, "data-home-v223-certification', 'fresh-exact-head-pixels-required")
  has(owner, "data-home-art-certification', 'fresh-exact-head-pixels-required")
  has(owner, "data-home-final-art-revision', 'v223-retained-pixels-pending")
  assert.doesNotMatch(`${currentRuntime}\n${currentGeometry}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
