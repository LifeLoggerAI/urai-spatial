import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const renderer = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))
const visualAuthority = readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const adapter = readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const reliquary = readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V288 remains the last certified Orb predecessor while V293 Home pixels stay fail-closed', () => {
  has(renderer, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(owner, 'data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"')
  assert.equal(authority.artRevision, 'v293-direct-bodyless-first-person-convergence')
  assert.equal(authority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(authority.currentRuntimeCandidate.homePresentationAuthority, 'direct-bodyless-first-person')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.equal((renderer.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(`${renderer}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('historical rock morphology is excluded from the current translucent visual owner', () => {
  assert.doesNotMatch(visualAuthority, /HomeOrbGroundedV288|HomeOrbReliquaryV286/)
  assert.match(visualAuthority, /home-orb-living-memory-visible-authority/)
  for (const marker of ['HomeOrbReliquaryV286','v288-grounded-biomorphic-memory-reliquary','home-gold-companion','fallbackVisualOwner: false','material.colorWrite = false','material.depthWrite = false']) has(adapter, marker)
  for (const marker of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world']) has(reliquary, marker)
})

test('current Home is persistent direct bodyless first-person with governed Orb', () => {
  for (const marker of [
    'bodyless-first-person-home',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    "cameraCheckpoint: 'ground-first-person-arrival'",
    "cameraCheckpoint: 'home-sky-ascent-complete'",
    'useHomeExperienceController',
    'HOME_WALK_SPEED',
    'data-home-non-xr-body-policy="camera-only-no-hands-body-rig"',
    'data-home-presence-policy="direct-first-person-camera-only-no-hands-body-rig"',
    'data-home-avatar-activation-gate="none-direct-first-person-home"',
    '<MobileMovementPad input={movementInput} label="Move through Home" />',
  ]) has(renderer, marker)
  assert.doesNotMatch(renderer, /HomeEmbodiedAvatar|home-human-makehuman-v4\.glb|visible-avatar-presentation-activation-gate|home-avatar-presentation/)
  assert.equal((renderer.match(/urai-home-user-avatar/g) ?? []).length, 1)
  assert.match(renderer, /const legacyHotspotPatterns = \[[\s\S]*\/urai-home-user-avatar\/,[\s\S]*\]/)
  assert.match(renderer, /CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'home-orb-living-memory-visible-authority'\]\)/)
  for (const marker of ['home-orb-reference-glass-shell','home-orb-luminous-inner-volume','home-orb-memory-bloom-core','home-orb-memory-motes',"visualAuthority: 'living-memory-translucent-heart'","interactionAuthority: 'v291-current-home-orb-state-and-speech-runtime'",'<HomeVisualAuthority>']) has(renderer, marker)
})
