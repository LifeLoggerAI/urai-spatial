import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const s = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV67.tsx', import.meta.url), 'utf8')

const visibleAssets = [
  "const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'",
  "const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'",
  "const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'",
  "const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'",
  'home-v69-scanned-reliquary-back',
  'home-v69-scanned-left-shell',
  'home-v69-scanned-right-shell',
  'home-v69-left-service-manifold',
  'home-v69-right-service-manifold',
  'home-orb-engineered-cradle',
  'home-ground-environmental-threshold',
  'home-life-map-physical-portal',
  'v69-ten-armored-fragment-contained-machine-core',
]

const governedIdentities = [
  "const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'",
  "const GOVERNED_PORTAL = '/assets/urai/generated/models/portal-ring-master-v1.glb'",
  "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
]

test('V69 visible Home is scanned rock and real industrial service art, not the rejected generated composition', () => {
  for (const marker of visibleAssets) assert.ok(s.includes(marker), `missing scanned-industrial V69 marker: ${marker}`)
  for (const marker of governedIdentities) assert.ok(s.includes(marker), `missing governed identity marker: ${marker}`)
  assert.match(s, /data-home-visible-world="v69-photogrammetry-industrial-reliquary"/)
  assert.match(s, /data-home-physical-base="scanned-rock-industrial-machine-sanctuary"/)
  assert.match(s, /data-home-visual-grade="cinematic-pbr-v69-scanned-industrial"/)
  assert.match(s, /data-home-final-art-revision="v69-photogrammetry-industrial-rebuild"/)
  assert.match(s, /data-home-visible-production-assets="rock_face_01 rock_face_02 modular_industrial_pipes_01 industrial_caged_sconce rock-tile-floor-pbr"/)
  assert.match(s, /useGLTF\.preload\(GOVERNED_HOME\)/)
  assert.match(s, /useGLTF\.preload\(GOVERNED_PORTAL\)/)
  assert.match(s, /useGLTF\.preload\(GOVERNED_ORB\)/)
  assert.doesNotMatch(s, /<GovernedModel|home-v67-governed-entry-chamber|home-v67-governed-orb-body/)
})

test('V69 Orb is a contained ten-fragment machine with no glass sphere, orbit rings, or generated avatar in visible composition', () => {
  assert.match(s, /function OrbMachine\(/)
  assert.match(s, /const FRAGMENTS:/)
  assert.match(s, /function ArmoredFragment\(/)
  assert.match(s, /octahedronGeometry/)
  assert.match(s, /v69-ten-armored-fragment-contained-machine-core/)
  assert.doesNotMatch(s, /RoundedBox|icosahedronGeometry|torusGeometry|#37e5ff|#48dfff|#6cf4ff/i)
})

test('V69 preserves bounded render cost, real traversal phases, and fail-closed visual certification', () => {
  assert.match(s, /dpr=\{1\}/)
  assert.match(s, /shadow-mapSize-width=\{768\}/)
  assert.match(s, /setPortalSequence\(traversal\), reducedMotion \? 180 : 900/)
  assert.match(s, /setPortalSequence\(closing\), reducedMotion \? 700 : 2500/)
  assert.match(s, /data-home-art-certification="v69-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(s, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
