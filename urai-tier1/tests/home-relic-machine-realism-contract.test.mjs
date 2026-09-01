import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const s = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')

const visibleAssets = [
  "const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'",
  "const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'",
  "const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'",
  "const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'",
  'home-v71-port-back-buttress',
  'home-v71-inner-port-rib',
  'home-v71-inner-starboard-rib',
  'home-v71-starboard-back-buttress',
  'home-v71-port-foundation-mass',
  'home-v71-starboard-foundation-mass',
  'home-v70-left-service-manifold',
  'home-v70-right-service-manifold',
  'home-orb-engineered-cradle',
  'home-ground-environmental-threshold',
  'home-life-map-physical-portal',
  'v72-vertical-armored-ovoid-ten-panel-machine',
  'data-home-animation-owner="v72-vertical-armored-ten-panel-orb-machine"',
]

const governedIdentities = [
  "const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'",
  "const GOVERNED_PORTAL = '/assets/urai/generated/models/portal-ring-master-v1.glb'",
  "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
]

test('V72 visible Home is one continuous PBR chamber with real industrial service art, not the rejected cutout collage', () => {
  for (const marker of visibleAssets) assert.ok(s.includes(marker), `missing vertical-industrial V72 marker: ${marker}`)
  for (const marker of governedIdentities) assert.ok(s.includes(marker), `missing governed identity marker: ${marker}`)
  assert.match(s, /data-home-visible-world="v72-vertical-armored-industrial-sanctuary"/)
  assert.match(s, /data-home-physical-base="continuous-pbr-rock-industrial-machine-sanctuary"/)
  assert.match(s, /data-home-visual-grade="cinematic-pbr-v72-vertical-armored-industrial"/)
  assert.match(s, /data-home-final-art-revision="v72-vertical-armored-threshold-rebuild"/)
  assert.match(s, /data-home-visible-production-assets="rock_face_01 rock_face_02 modular_industrial_pipes_01 industrial_caged_sconce rock-tile-floor-pbr"/)
  assert.match(s, /useGLTF\.preload\(GOVERNED_HOME\)/)
  assert.match(s, /useGLTF\.preload\(GOVERNED_PORTAL\)/)
  assert.match(s, /useGLTF\.preload\(GOVERNED_ORB\)/)
  assert.doesNotMatch(s, /<GovernedModel|home-v67-governed-entry-chamber|home-v67-governed-orb-body/)
})

test('V72 Orb is a continuous armored ten-panel machine with no greybox mass, glass sphere, or orbit rings', () => {
  assert.match(s, /function OrbMachine\(/)
  assert.match(s, /function OrbPanelGeometry\(/)
  assert.match(s, /new THREE\.BufferGeometry\(\)/)
  assert.match(s, /function EngineeredOrbHullGeometry\(\)/)
  assert.match(s, /new THREE\.LatheGeometry\(profile, 12\)/)
  assert.match(s, /FRAGMENTS\.map\(\(fragment\) => <OrbPanel/)
  assert.match(s, /v72-vertical-armored-ovoid-ten-panel-machine/)
  assert.match(s, /data-home-animation-owner="v72-vertical-armored-ten-panel-orb-machine"/)
  assert.doesNotMatch(s, /function Beam\(|function StoneMass\(|RoundedBox|octahedronGeometry|icosahedronGeometry|torusGeometry|capsuleGeometry|#37e5ff|#48dfff|#6cf4ff/i)
})

test('V72 preserves bounded render cost, real traversal phases, and fail-closed visual certification', () => {
  assert.match(s, /dpr=\{1\}/)
  assert.match(s, /shadow-mapSize-width=\{768\}/)
  const traversalTimerIndex = s.indexOf('const traversalTimer = window.setTimeout(() => {')
  const closingTimerIndex = s.indexOf('closingTimer = window.setTimeout(() => {')
  const navigationTimerIndex = s.indexOf('navigationTimer = window.setTimeout(() => {')
  assert.ok(traversalTimerIndex >= 0 && closingTimerIndex > traversalTimerIndex && navigationTimerIndex > closingTimerIndex)
  assert.match(s, /reducedMotion \? 180 : 900/)
  assert.match(s, /reducedMotion \? 520 : 1600/)
  assert.match(s, /reducedMotion \? 500 : 1100/)
  assert.match(s, /data-home-art-certification="v72-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(s, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
