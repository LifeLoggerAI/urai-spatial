import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V44 owns Home as one monolithic reliquary apse instead of detached slabs', () => {
  assert.match(source,/v44-monolithic-reliquary-apse-production-candidate/)
  assert.match(source,/v44-single-monolithic-asymmetric-reliquary-apse-no-detached-ceiling-slabs/)
  assert.match(source,/v44-layered-recessed-machine-cavity-no-empty-black-void/)
  assert.doesNotMatch(source,/v43-open-center-asymmetric-vault-shoulders-no-ceiling-sheet/)
})

test('V44 reliquary has broad floor-rooted armor yokes and no display platform', () => {
  assert.match(source,/v44-broad-floor-rooted-armor-yoke-no-spikes-no-feet/)
  assert.match(source,/v44-no-black-platform-floor-remains-continuous/)
  assert.match(source,/v44-monolithic-apse-and-broad-yokes-physically-capture-core-no-display-stand/)
  assert.doesNotMatch(source,/<coneGeometry/)
  assert.doesNotMatch(source,/<ReliquarySpine\/>/)
})

test('V44 retires glass shell, orbit rings, and crystalline petal display while retaining authored core', () => {
  assert.match(source,/object\.name === 'orb-aura'/)
  assert.match(source,/object\.name === 'orb-core'/)
  assert.match(source,/object\.name\.startsWith\('orb-orbit-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-petal-'\)/)
  assert.match(source,/v44-authored-heart-filament-core-no-glass-petals-no-rings/)
  assert.match(orbSource,/primitive object=\{authoredOrb\}/)
  assert.match(orbSource,/scale=\{1\.58\}/)
  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry/)
})

test('V44 keeps photographic PBR, local HDR, and wider mobile framing', () => {
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=1\.72/)
  assert.match(source,/desiredFov=portrait\?66:55/)
  assert.match(source,/lookHeight=portrait\?2\.04:1\.94/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
