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

test('Ground replacement is a scanned-rock-framed geological cleft and leaves the traversable throat contract intact', () => {
  assert.match(art, /home-current-ground-geological-descent/)
  assert.match(art, /weathered-world-emergent-descent/)
  assert.match(art, /home-v234-ground-scanned-stone-threshold/)
  assert.match(art, /v243-rock-framed-ground-cleft/)
  assert.match(art, /ScannedRock/)
  assert.match(art, /apertureGeometry/)
  assert.doesNotMatch(art, /TorusGeometry|torusGeometry|RingGeometry|ringGeometry|TubeGeometry/)
})

test('Life Map replacement is a narrow scanned-rock lineage rift rather than tube or membrane architecture', () => {
  assert.match(art, /home-current-life-map-rooted-ascent/)
  assert.match(art, /rooted-ascent-not-tube-portal/)
  assert.match(art, /v243-rock-framed-lineage-rift/)
  assert.match(art, /ScannedRock/)
  assert.match(art, /points geometry=\{stars\}/)
  assert.doesNotMatch(art, /TubeGeometry|function membrane\(/)
})

test('Orb repair is one tapered scarred state-aware connected presence', () => {
  assert.match(art, /home-current-orb-surface-memory/)
  assert.match(art, /v243-tapered-scarred-living-memory-presence/)
  assert.match(art, /one-connected-asymmetric-history-bearing-presence/)
  assert.match(art, /new THREE\.IcosahedronGeometry\(1, 4\)/)
  assert.match(art, /const stateIntensity: Record<OrbState, number>/)
  assert.match(art, /stateIntensity\[state\]/)
  assert.match(art, /reducedMotion\?\.72:1/)
  assert.doesNotMatch(art, /new THREE\.SphereGeometry/)
})
