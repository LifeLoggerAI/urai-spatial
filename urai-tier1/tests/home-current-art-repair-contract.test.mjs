import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const art = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(fs.readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

test('current Home mounts one explicit art repair layer and declares it in visual authority', () => {
  assert.match(owner, /import \{HomeCurrentArtRepair\} from '\.\/HomeCurrentArtRepair'/)
  assert.match(owner, /<HomeCurrentArtRepair orbState=\{p\.orbState\} reducedMotion=\{p\.reducedMotion\}/)
  assert.equal(authority.artRevision, 'current-smooth-living-memory-and-recessed-threshold-repair')
  assert.ok(authority.runtimeAssets.includes('HomeCurrentArtRepair.tsx'))
})

test('Ground replacement is a scanned-rock-framed geological cleft with recessed readable threshold treatment', () => {
  assert.match(art, /home-current-ground-geological-descent/)
  assert.match(art, /weathered-world-emergent-descent/)
  assert.match(art, /home-v234-ground-scanned-stone-threshold/)
  assert.match(art, /v246-recessed-readable-ground-cleft/)
  assert.match(art, /scale\[0\] \* \.78/)
  assert.match(art, /ScannedRock/)
  assert.match(art, /apertureGeometry/)
  assert.doesNotMatch(art, /TorusGeometry|torusGeometry|RingGeometry|ringGeometry|TubeGeometry/)
})

test('Life Map replacement is a narrow readable lineage rift rather than tube, membrane, or slab architecture', () => {
  assert.match(art, /home-current-life-map-rooted-ascent/)
  assert.match(art, /rooted-ascent-not-tube-portal/)
  assert.match(art, /v246-recessed-readable-lineage-rift/)
  assert.match(art, /ScannedRock/)
  assert.match(art, /points geometry=\{stars\}/)
  assert.doesNotMatch(art, /TubeGeometry|function membrane\(/)
})

test('Orb repair is one smooth tapered scarred state-aware connected living-memory presence', () => {
  assert.match(art, /home-current-orb-surface-memory/)
  assert.match(art, /v246-smooth-living-memory-heart/)
  assert.match(art, /one-connected-asymmetric-history-bearing-living-presence-not-rock/)
  assert.match(art, /new THREE\.SphereGeometry\(1, 96, 64\)/)
  assert.match(art, /const stateIntensity: Record<OrbState, number>/)
  assert.match(art, /stateIntensity\[state\]/)
  assert.match(art, /reducedMotion\?\.72:1/)
  assert.doesNotMatch(art, /new THREE\.IcosahedronGeometry\(1, 4\)/)
})
