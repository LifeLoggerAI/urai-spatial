import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart, 'SacredOrb function boundary must remain discoverable')
const orbSource = source.slice(orbStart, orbEnd)

const architectureStart = source.indexOf('function SanctuaryArchitecture')
const architectureEnd = source.indexOf('function SanctuaryGlazing', architectureStart)
assert.ok(architectureStart >= 0 && architectureEnd > architectureStart, 'SanctuaryArchitecture function boundary must remain discoverable')
const architectureSource = source.slice(architectureStart, architectureEnd)

test('live Home owner is the V43 open-vault integrated relic-machine candidate', () => {
  assert.match(source, /v43-relic-machine-open-vault-production-candidate/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /v43-open-center-asymmetric-vault-shoulders-no-ceiling-sheet/)
  assert.match(source, /v43-grounded-rear-buttress-fingers-no-backplate-no-square-footings/)
  assert.match(source, /v43-open-depth-with-grounded-buttress-fingers/)
  assert.doesNotMatch(architectureSource, /<SanctuaryShellMass/)
  assert.doesNotMatch(architectureSource, /v42-sanctuary-integrated-relic-machine-production-candidate/)
})

test('live reliquary uses floor-embedded faceted capture yokes seated into the open vault', () => {
  assert.match(source, /v43-floor-embedded-faceted-capture-yoke-no-visible-footing/)
  assert.match(source, /v43-separated-capture-yokes-seat-into-open-vault-shoulders/)
  assert.match(source, /v43-flush-foundation-service-inlays-no-platform-no-pedestal/)
  assert.match(source, /v43-authored-heart-captured-by-architectural-yokes-no-display-ring-no-pedestal/)
  assert.match(source, /v43-faceted-structural-member-no-tube-grammar/)
  assert.match(source, /home-orb-engineered-cradle/)
  assert.match(source, /ServiceConduit side=\{-1\}/)
  assert.match(source, /ServiceConduit side=\{1\}/)
  assert.doesNotMatch(source, /<ReliquarySpine\/>/)
})

test('live Orb keeps governed authored heart/petal machinery while retiring display shell and orbit rings', () => {
  assert.match(source, /v43-governed-authored-heart-petal-machine-core/)
  assert.match(orbSource, /primitive object=\{authoredOrb\}/)
  assert.match(orbSource, /scale=\{1\.32\}/)
  assert.match(source, /v43-authored-core-no-aura-no-orbit-rings/)
  assert.match(source, /object\.name === 'orb-aura'/)
  assert.match(source, /object\.name === 'orb-core'/)
  assert.match(source, /object\.name\.startsWith\('orb-orbit-'\)/)
  assert.doesNotMatch(orbSource, /RoundedBox/)
  assert.doesNotMatch(orbSource, /torusGeometry/)
  assert.doesNotMatch(orbSource, /dodecahedronGeometry/)
  assert.doesNotMatch(orbSource, /icosahedronGeometry/)
  assert.doesNotMatch(orbSource, /octahedronGeometry/)
  assert.doesNotMatch(orbSource, /sphereGeometry/)
})

test('V43 preserves cinematic exposure and widens desktop/mobile framing without hiding defects', () => {
  assert.match(source, /gl\.toneMappingExposure=1\.62/)
  assert.match(source, /desiredFov=portrait\?60:53/)
  assert.match(source, /lookHeight=portrait\?2\.12:1\.98/)
  assert.match(source, /ambientLight intensity=\{0\.62\}/)
  assert.match(source, /hemisphereLight args=\{\['#c8ddd7','#25312b',0\.86\]\}/)
  assert.match(source, /camera\.lookAt\(ORB\.x,ORB\.y-\.08,ORB\.z\)/)
})

test('live Home keeps photographic PBR and local HDR environment assets', () => {
  assert.match(source, /rock-tile-floor-diff-1k\.webp/)
  assert.match(source, /rock-tile-floor-normal-gl-1k\.webp/)
  assert.match(source, /rock-tile-floor-arm-1k\.webp/)
  assert.match(source, /studio-small-08-1k\.hdr/)
  assert.doesNotMatch(source, /new THREE\.DataTexture/)
  assert.doesNotMatch(source, /makeWeatheredStonePack/)
})

test('embodied presence does not expose a development mannequin in the live sanctuary', () => {
  assert.match(source, /function HumanPresence/)
  assert.match(source, /visible=\{false\}/)
})
