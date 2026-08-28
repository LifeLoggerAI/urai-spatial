import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V45 owns Home as an angular integrated apse instead of the rejected arch facade', () => {
  assert.match(source,/v45-integrated-reliquary-production-candidate/)
  assert.match(source,/v45-single-angular-monolithic-apse-no-arch-facade-no-detached-slabs/)
  assert.match(source,/v45-deep-machined-cavity-with-layered-rear-bulkhead/)
  assert.doesNotMatch(source,/home-v44-monolithic-reliquary-apse/)
})

test('V45 reliquary uses dark machined floor-rooted yokes with voids and no display mat', () => {
  assert.match(source,/v45-dark-machined-floor-rooted-yoke-with-void-no-flat-panel-no-feet/)
  assert.match(source,/v45-no-display-platform-no-contact-shadow-mat-floor-remains-continuous/)
  assert.match(source,/v45-recessed-apse-and-machined-yokes-physically-seat-core-no-display-stand/)
  assert.doesNotMatch(source,/<coneGeometry/)
  assert.doesNotMatch(source,/<ContactShadows position=\{\[0,0\.03,-3\.55\]\}/)
})

test('V45 retires the glass display family and shortens retained authored filaments inside the machine core', () => {
  assert.match(source,/object\.name === 'orb-aura'/)
  assert.match(source,/object\.name === 'orb-core'/)
  assert.match(source,/object\.name\.startsWith\('orb-orbit-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-petal-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.3\)/)
  assert.match(source,/v45-authored-heart-short-filament-core-embedded-no-glass-no-rings/)
  assert.match(orbSource,/primitive object=\{authoredOrb\}/)
  assert.match(orbSource,/scale=\{1\.18\}/)
  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry/)
})

test('V45 keeps photographic PBR and widens the mobile view without approving pixels by code', () => {
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=1\.68/)
  assert.match(source,/desiredFov=portrait\?72:58/)
  assert.match(source,/lookHeight=portrait\?1\.9:1\.86/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
