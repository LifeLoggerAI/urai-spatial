import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V46 owns Home as separated load-bearing apse masses instead of the rejected arch facade', () => {
  assert.match(source,/v46-integrated-machine-apse-production-candidate/)
  assert.match(source,/v46-separated-load-bearing-apse-masses-with-deep-open-machine-bay-no-arch-facade/)
  assert.match(source,/v46-deep-open-machine-bay-with-staggered-bulkheads-and-floor-service-depth/)
  assert.match(source,/home-v46-left-apse-mass/)
  assert.match(source,/home-v46-right-apse-mass/)
  assert.doesNotMatch(source,/home-v45-monolithic-reliquary-apse/)
})

test('V46 reliquary uses separated machined cheek yokes with open center and no display mat', () => {
  assert.match(source,/v46-separated-machined-cheek-yoke-with-open-center-and-no-visible-feet/)
  assert.match(source,/v46-no-display-platform-floor-remains-continuous/)
  assert.match(source,/v46-deep-machine-bay-and-separated-yokes-physically-capture-core-no-display-stand/)
  assert.match(source,/v46-layered-machined-aperture-captures-authored-heart-trace/)
  assert.doesNotMatch(source,/<coneGeometry/)
  assert.doesNotMatch(source,/<ContactShadows position=\{\[0,0\.03,-3\.55\]\}/)
})

test('V46 retires the glass/crystal display family and reduces authored heart/filaments behind the machine aperture', () => {
  assert.match(source,/object\.name === 'orb-aura'/)
  assert.match(source,/object\.name === 'orb-core'/)
  assert.match(source,/object\.name\.startsWith\('orb-orbit-'\)/)
  assert.match(source,/object\.name\.startsWith\('orb-petal-'\)/)
  assert.match(source,/object\.name === 'orb-heart'/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.22\)/)
  assert.match(source,/object\.name\.startsWith\('orb-filament-'\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.12\)/)
  assert.match(source,/v46-authored-heart-filament-trace-behind-machined-aperture-no-crystal-display/)
  assert.match(orbSource,/primitive object=\{authoredOrb\}/)
  assert.match(orbSource,/scale=\{0\.58\}/)
  assert.match(orbSource,/position=\{\[0,\.02,-2\.16\]\}/)
  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry/)
})

test('V46 keeps photographic PBR, increases readable exposure, and preserves wider mobile framing without approving pixels by code', () => {
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=1\.9/)
  assert.match(source,/desiredFov=portrait\?68:56/)
  assert.match(source,/lookHeight=portrait\?1\.82:1\.78/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
