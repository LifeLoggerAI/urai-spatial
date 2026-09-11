import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const art = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(fs.readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

test('current Home mounts one explicit art repair layer and declares it in visual authority', () => {
  assert.match(owner, /import \{HomeCurrentArtRepair\} from '\.\/HomeCurrentArtRepair'/)
  assert.match(owner, /<HomeCurrentArtRepair orbState=\{p\.orbState\} reducedMotion=\{p\.reducedMotion\}\/>/)
  assert.equal(authority.artRevision, 'current-geological-threshold-and-memory-crown-repair')
  assert.ok(authority.runtimeAssets.includes('HomeCurrentArtRepair.tsx'))
})

test('Ground replacement is geological and leaves the existing traversable throat contract intact', () => {
  assert.match(art, /home-current-ground-geological-descent/)
  assert.match(art, /weathered-world-emergent-descent/)
  assert.match(art, /home-v231-ground-weathered-threshold/)
  assert.doesNotMatch(art, /TorusGeometry|torusGeometry/)
  assert.doesNotMatch(art, /RingGeometry|ringGeometry/)
})

test('Life Map replacement uses broad authored membranes rather than TubeGeometry architecture', () => {
  assert.match(art, /home-current-life-map-rooted-ascent/)
  assert.match(art, /rooted-ascent-not-tube-portal/)
  assert.match(art, /function membrane\(/)
  assert.doesNotMatch(art, /TubeGeometry/)
})

test('Orb repair remains surface-bound and state-aware in reduced motion', () => {
  assert.match(art, /home-current-orb-surface-memory/)
  assert.match(art, /surface-bound-nervature/)
  assert.match(art, /const stateIntensity: Record<OrbState, number>/)
  assert.match(art, /reducedMotion \? stateIntensity\[state\] \* \.82 : stateIntensity\[state\]/)
})
