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

test('V288 remains the last certified predecessor while V292 current candidate pixels stay fail-closed', () => {
  has(renderer, 'export function HomeWorldProductionV223')
  has(renderer, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(owner, 'data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"')
  assert.equal(authority.artRevision, 'v292-avatar-presentation-bodyless-first-person-convergence')
  assert.equal(authority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.equal(authority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.ok(authority.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbReliquaryV286.tsx'))
  assert.ok(authority.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbGroundedV288.tsx'))
  assert.equal(authority.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(authority.currentRuntimeCandidate.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.equal((renderer.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(`${renderer}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('V288 certified predecessor keeps evidence without overriding the current V291 Orb', () => {
  assert.doesNotMatch(visualAuthority, /HomeOrbGroundedV288|<HomeOrbGroundedV288/)
  assert.match(visualAuthority, /return null/)
  for (const marker of ['HomeOrbReliquaryV286','v288-grounded-biomorphic-memory-reliquary','home-gold-companion','fallbackVisualOwner: false','material.colorWrite = false','material.depthWrite = false','material.opacity = 0','interactionOwner: true','interactionOwner: false']) has(adapter, marker)
  for (const marker of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field','home-v286-inlaid-ground-memory-traces']) has(reliquary, marker)
  assert.doesNotMatch(reliquary, /home-v253-literal-living-memory-heart|livingHeartGeometryV253/)
  assert.doesNotMatch(reliquary, /root\.current\.scale\.setScalar\(|whole-object|wireframe/)
  assert.match(reliquary, /raycast=\{\(\) => null\}/)
})

test('current candidate Home keeps governed Avatar presentation, governed Orb and persistent bodyless camera-only first-person Home', () => {
  for (const marker of [
    'HomeEmbodiedAvatar',
    'visible-avatar-presentation-activation-gate',
    'bodyless-first-person-home',
    'avatar-presentation-to-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    "cameraCheckpoint: 'ground-first-person-arrival'",
    "cameraCheckpoint: 'home-sky-ascent-complete'",
    "router.prefetch('/ground/')",
    "router.prefetch('/life-map/')",
    'event.point.clone()',
    'setLoop(THREE.LoopOnce, 1)',
    'useHomeExperienceController',
    'HOME_WALK_SPEED',
    'data-home-non-xr-body-policy="camera-only-no-hands-body-rig"',
    'data-home-presence-policy="presentation-avatar-then-first-person-camera-only-no-hands-body-rig"',
    'data-home-avatar-activation-gate="required-before-first-person-home"',
    '<MobileMovementPad input={movementInput} label="Move through Home" />',
    "enabled: firstPerson && transition === 'none' && !homeState.inputLocked && !passportDeparting",
  ]) has(renderer, marker)
  assert.match(renderer, /<HomeEmbodiedAvatar/)
  assert.doesNotMatch(renderer, /HOME_AVATAR_MODEL|visible-cinematic-avatar|visible-avatar-third-person|hidden-exterior-avatar-first-person/)
  assert.match(renderer, /CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'urai-home-user-avatar'\]\)/)
  assert.match(renderer, /\/home-visible-user-avatar\//)
  assert.match(renderer, /\/urai-home-user-avatar\//)
  assert.doesNotMatch(renderer, /privacy-preserving-first-person/)
  assert.doesNotMatch(renderer, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/)
  assert.doesNotMatch(renderer, /HOME_LIFE_MAP|nearby\s*===\s*['"]life-map['"]/)
  for (const marker of ['home-orb-reference-glass-shell','home-orb-luminous-inner-volume','home-orb-memory-bloom-core','home-orb-memory-motes',"visualAuthority: 'v291-translucent-memory-orb-reference-candidate'"]) has(renderer, marker)
  assert.doesNotMatch(renderer, /home-orb-stabilizer-ring|home-orb-crystalline-fragments/)
})

test('rendering stays bounded and Orb state/reduced-motion telemetry remains exact-head proofable', () => {
  assert.match(renderer, /dpr=\{1\}/)
  assert.match(renderer, /data-home-orb-state=\{orbState\}/)
  assert.match(renderer, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState, reducedMotion, true\)\.animation\}/)
  assert.match(renderer, /data-home-orb-model-clip=\{reducedMotion \? 'stopped-reduced-motion'/)
  assert.match(renderer, /const expressiveEnergy = reducedMotion \? 0/)
  assert.match(geometry, /export const ORB\s*=\s*new THREE\.Vector3/)
  has(owner, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
})
