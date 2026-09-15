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
const authority = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V287 is the current cinematic Home authority while historical geometry remains provenance only', () => {
  has(currentRuntime, 'export function HomeWorldProductionV223')
  has(currentRuntime, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(currentRuntime, 'data-home-embodied-self="visible-cinematic-avatar"')
  has(currentRuntime, 'data-home-movement="camera-look-world-surface-selection"')
  has(currentRuntime, 'home-visible-user-avatar')
  has(currentRuntime, 'home-gold-companion')
  has(owner, 'data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"')
  has(owner, "world.setAttribute('data-home-v223-art-layer', 'cinematic-threshold-runtime-authority')")
  has(owner, "world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')")
  has(owner, 'data-home-v226-retained-pixel-rebuild="active"')
  has(owner, 'data-home-v225-retained-pixel-rebuild="superseded"')
  assert.equal(authority.artRevision, 'v287-cinematic-lived-world-threshold')
  assert.equal(authority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.equal((currentRuntime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(currentGeometry, /<Canvas/)
  assert.doesNotMatch(currentVisual, /<Canvas/)
  assert.match(legacyRuntime, /export function HomeWorldProductionV70/)
  assert.match(legacyArt, /export function HomeV76Sanctuary/)
})

test('historical V225 physical geometry remains available without owning current Home interaction', () => {
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
  assert.doesNotMatch(currentRuntime, /import \{[^}]*\bGROUND\b[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/)
  assert.doesNotMatch(currentRuntime, /import \{[^}]*\bLIFE_MAP\b[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/)
})

test('V287 Orb is a grounded companion beside the visible user with governed state output', () => {
  for (const marker of ['function OrbCompanion(', 'home-gold-companion', "semanticOwner: 'orb'", 'groundedCompanion: true', 'COMPANION_POSITION']) has(currentRuntime, marker)
  assert.match(currentRuntime, /data-home-orb-state=\{orbState\}/)
  assert.match(currentRuntime, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState, reducedMotion, true\)\.animation\}/)
  assert.match(currentRuntime, /event\.stopPropagation\(\); onOrb\(\)/)
  assert.match(currentRuntime, /const groundY = height\(COMPANION_POSITION\.x, COMPANION_POSITION\.z\)/)
  assert.doesNotMatch(owner, /const HOME_ORB = \{ x: -\.45, z: -7\.45 \} as const/)
  assert.doesNotMatch(owner, /home-orb-physical-portal|Orb portal|orb portal/i)
})

test('V287 keeps bounded rendering, progress-driven Ground/Sky traversal and fail-closed pixel certification', () => {
  assert.match(currentRuntime, /dpr=\{1\}/)
  assert.match(currentRuntime, /cameraCheckpoint: 'ground-first-person-arrival'/)
  assert.match(currentRuntime, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(currentRuntime, /t >= \.995 && !completed\.current/)
  assert.match(currentRuntime, /data-home-ground-entry="physical-world-surface"/)
  assert.match(currentRuntime, /data-home-life-map-entry="visible-sky-broad-interaction"/)
  assert.doesNotMatch(currentRuntime, /setTimeout\([^\n]*transition[^\n]*ground/)
  assert.doesNotMatch(currentRuntime, /MobileMovementPad|stepEmbodiedMotion|useMovementInput/)
  has(owner, "world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')")
  has(owner, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
  assert.doesNotMatch(`${currentRuntime}\n${currentGeometry}\n${currentVisual}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
