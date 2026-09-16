import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const renderer = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))
const visualAuthority = readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const adapter = readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const reliquary = readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const geometry = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V288 keeps one current cinematic Home owner and fail-closed visual authority metadata', () => {
  has(renderer, 'export function HomeWorldProductionV223')
  has(renderer, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(owner, 'data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"')
  assert.equal(authority.artRevision, 'v288-cinematic-lived-world-grounded-reliquary')
  assert.equal(authority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.equal(authority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.ok(authority.runtimeAssets.includes('HomeOrbReliquaryV286.tsx'))
  assert.ok(authority.runtimeAssets.includes('HomeOrbGroundedV288.tsx'))
  assert.equal((renderer.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(`${renderer}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('V288 restores the biomorphic reliquary as pixels while preserving the grounded V287 interaction owner', () => {
  has(visualAuthority, "import { HomeOrbGroundedV288 } from '../assets/HomeOrbGroundedV288'")
  has(visualAuthority, '<HomeOrbGroundedV288 />')
  for (const marker of ['HomeOrbReliquaryV286','v288-grounded-biomorphic-memory-reliquary','home-gold-companion','fallbackVisualOwner: false','material.colorWrite = false','material.depthWrite = false','material.opacity = 0','interactionOwner: true','interactionOwner: false']) has(adapter, marker)
  for (const marker of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field','home-v286-inlaid-ground-memory-traces']) has(reliquary, marker)
  assert.doesNotMatch(reliquary, /home-v253-literal-living-memory-heart|livingHeartGeometryV253/)
  assert.doesNotMatch(reliquary, /root\.current\.scale\.setScalar\(|whole-object|wireframe/)
  assert.match(reliquary, /raycast=\{\(\) => null\}/)
})

test('V287 cinematic Home, physical Ground and broad-sky Life Map authority remain intact beneath the Orb repair', () => {
  for (const marker of ['data-home-embodied-self="visible-cinematic-avatar"','data-home-ground-entry="physical-world-surface"','data-home-life-map-entry="visible-sky-broad-interaction"',"cameraCheckpoint: 'ground-first-person-arrival'","cameraCheckpoint: 'home-sky-ascent'","cameraCheckpoint: 'home-sky-ascent-complete'","router.prefetch('/ground/')","router.prefetch('/life-map/')",'event.point.clone()']) has(renderer, marker)
  assert.doesNotMatch(renderer, /HOME_LIFE_MAP|nearby\s*===\s*['"]life-map['"]|useMovementInput|MobileMovementPad/)
})

test('rendering stays bounded and Orb state/reduced-motion telemetry remains exact-head proofable', () => {
  assert.match(renderer, /dpr=\{1\}/)
  assert.match(renderer, /data-home-orb-state=\{orbState\}/)
  assert.match(renderer, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState, reducedMotion, true\)\.animation\}/)
  assert.match(renderer, /data-home-orb-model-clip=\{reducedMotion \? 'stopped-reduced-motion'/)
  assert.match(geometry, /export const ORB\s*=\s*new THREE\.Vector3/)
  has(owner, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
})
