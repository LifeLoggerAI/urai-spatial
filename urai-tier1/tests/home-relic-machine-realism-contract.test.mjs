import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V47 replaces the cabinet facade with asymmetric sanctuary depth', () => {
  assert.match(source,/v47-sanctuary-depth-production-candidate/)
  assert.match(source,/v47-asymmetric-load-bearing-apse-masses-with-open-machine-bay-no-arch-facade/)
  assert.match(source,/v47-staggered-side-gallery-masses-create-sanctuary-depth-no-repeated-bays/)
  assert.match(source,/v47-deep-open-machine-bay-with-staggered-bulkheads-floor-service-depth-and-side-galleries/)
  assert.match(source,/home-v47-left-apse-mass/)
  assert.match(source,/home-v47-right-apse-mass/)
  assert.doesNotMatch(source,/home-v46-left-machined-yoke|home-v46-right-machined-yoke/)
})

test('V47 uses low canted load arms and no display stand', () => {
  assert.match(source,/v47-low-canted-floor-rooted-load-arm-open-center-no-panel-no-visible-feet/)
  assert.match(source,/v47-no-display-platform-floor-remains-continuous/)
  assert.match(source,/v47-deep-machine-bay-and-low-load-arms-physically-capture-core-no-display-stand/)
  assert.doesNotMatch(source,/<coneGeometry/)
  assert.doesNotMatch(source,/<ContactShadows position=\{\[0,0\.03,-3\.55\]\}/)
})

test('V47 removes freestanding portal arches from hero composition and deepens the authored core', () => {
  assert.match(source,/v47-recessed-threshold-seam-no-freestanding-arch-or-columns/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.14\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.065\)/)
  assert.match(source,/v47-authored-heart-filament-trace-deep-behind-machined-aperture-no-crystal-display/)
  assert.match(orbSource,/scale=\{0\.38\}/)
  assert.match(orbSource,/position=\{\[0,\.02,-2\.7\]\}/)
  assert.doesNotMatch(orbSource,/torusGeometry|sphereGeometry|dodecahedronGeometry|icosahedronGeometry|octahedronGeometry/)
})

test('V47 renders authored room depth and readable PBR without claiming pixel pass in code', () => {
  assert.match(source,/<SanctuaryCeiling \/>/)
  assert.match(source,/<FloorPanelJoints \/>/)
  assert.match(source,/<ReflectingChannel x=\{-4\.72\} \/>/)
  assert.match(source,/<PlantedEdges reducedMotion=\{props\.reducedMotion\} \/>/)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=2\.05/)
  assert.match(source,/desiredFov=portrait\?64:54/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
