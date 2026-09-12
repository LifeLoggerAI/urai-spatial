import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const art = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(fs.readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

test('current Home mounts one explicit art repair layer and declares it in visual authority', () => {
  assert.match(owner, /import \{HomeCurrentArtRepair\} from '\.\/HomeCurrentArtRepair'/)
  assert.match(owner, /<HomeCurrentArtRepair orbState=\{p\.orbState\} reducedMotion=\{p\.reducedMotion\}/)
  assert.equal(authority.artRevision, 'current-folded-living-memory-and-deep-recessed-threshold-repair')
  assert.ok(authority.runtimeAssets.includes('HomeCurrentArtRepair.tsx'))
})

test('Ground replacement is a deeply recessed scanned-rock geological cleft without foreground slab authority', () => {
  assert.match(art, /home-current-ground-geological-descent/)
  assert.match(art, /weathered-world-emergent-descent/)
  assert.match(art, /home-v234-ground-scanned-stone-threshold/)
  assert.match(art, /v247-recessed-ground-cleft/)
  assert.match(art, /scale\[0\] \* \.50/)
  assert.match(art, /ScannedRock/)
  assert.match(art, /apertureGeometry/)
  assert.doesNotMatch(art, /TorusGeometry|torusGeometry|RingGeometry|ringGeometry|TubeGeometry/)
})

test('Life Map replacement is a deeply recessed lineage rift rather than tube, membrane, or slab architecture', () => {
  assert.match(art, /home-current-life-map-rooted-ascent/)
  assert.match(art, /rooted-ascent-not-tube-portal/)
  assert.match(art, /v247-recessed-lineage-rift/)
  assert.match(art, /ScannedRock/)
  assert.match(art, /points geometry=\{stars\}/)
  assert.doesNotMatch(art, /TubeGeometry|function membrane\(/)
})

test('Orb repair is one smooth folded scarred state-aware connected living-memory mantle', () => {
  assert.match(art, /home-current-orb-surface-memory/)
  assert.match(art, /v247-folded-living-memory-mantle/)
  assert.match(art, /one-connected-asymmetric-folded-history-bearing-presence-not-clay-heart-not-rock/)
  assert.match(art, /new THREE\.SphereGeometry\(1, 112, 72\)/)
  assert.match(art, /const stateIntensity: Record<OrbState, number>/)
  assert.match(art, /stateIntensity\[state\]/)
  assert.match(art, /reducedMotion\?\.72:1/)
  assert.doesNotMatch(art, /new THREE\.IcosahedronGeometry\(1, 4\)/)
  assert.doesNotMatch(art, /v246-smooth-living-memory-heart/)
})
