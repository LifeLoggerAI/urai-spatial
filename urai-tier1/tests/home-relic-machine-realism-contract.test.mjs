import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const s = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV67.tsx', import.meta.url), 'utf8')

const required = [
  "const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'",
  "const GOVERNED_PORTAL = '/assets/urai/generated/models/portal-ring-master-v1.glb'",
  "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
  'home-v67-governed-entry-chamber',
  'home-v67-governed-orb-body',
  'home-orb-engineered-cradle',
  'home-ground-environmental-threshold',
  'home-life-map-physical-portal',
  'v67-six-armored-fragment-machine-with-contained-core',
  'v67-single-bounded-photogrammetry-relief',
]

test('V67 is a governed authored-coordinate PBR sanctuary rather than a recentered blockout', () => {
  for (const marker of required) assert.ok(s.includes(marker), `missing governed V67 marker: ${marker}`)
  assert.match(s, /preserveAuthoredCoordinates \? tuneModel\(gltf\.scene, mode\) : prepareModel/)
  assert.match(s, /name="home-v67-governed-entry-chamber" position=\{\[0, 0, -5\.4\]\} scale=\{\[1\.00, 1\.00, 1\.00\]\} span=\{18\.69\} mode="stone" preserveAuthoredCoordinates/)
  assert.match(s, /data-home-visible-world="v67-governed-authored-stone-relic-sanctuary"/)
  assert.match(s, /data-home-physical-base="authored-stone-machine-reliquary"/)
  assert.match(s, /data-home-visual-grade="cinematic-pbr-v67-governed-reliquary"/)
  assert.match(s, /data-home-final-art-revision="v67-governed-authored-coordinate-rebuild"/)
  assert.doesNotMatch(s, /HomeWorldProductionFinal|v66-enclosed-reliquary-candidate/)
})

test('V67 uses governed Orb and portal binaries while rejecting the retired glass-sphere grammar', () => {
  assert.match(s, /<GovernedModel url=\{GOVERNED_ORB\} name="home-v67-governed-orb-body"/)
  assert.match(s, /<GovernedModel url=\{GOVERNED_PORTAL\}/)
  assert.match(s, /const FRAGMENTS:/)
  assert.match(s, /function ArmoredFragment\(/)
  assert.match(s, /dodecahedronGeometry/)
  assert.match(s, /transmission = 0/)
  assert.doesNotMatch(s, /RoundedBox|icosahedronGeometry|#37e5ff|#48dfff|#6cf4ff/i)
})

test('V67 preserves bounded render cost, real traversal phases, and fail-closed visual certification', () => {
  assert.match(s, /dpr=\{1\}/)
  assert.match(s, /shadow-mapSize-width=\{768\}/)
  assert.match(s, /setPortalSequence\(traversal\), reducedMotion \? 180 : 900/)
  assert.match(s, /setPortalSequence\(closing\), reducedMotion \? 700 : 2500/)
  assert.match(s, /data-home-art-certification="v67-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(s, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
