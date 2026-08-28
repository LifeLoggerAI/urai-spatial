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

test('live Home owner is the V42 sanctuary-integrated relic-machine candidate', () => {
  assert.match(source, /v42-sanctuary-integrated-relic-machine-production-candidate/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /v42-high-clearance-continuous-bearing-vault/)
  assert.match(source, /v42-rear-recessed-buttress-outside-orb-hero-frame/)
  assert.match(source, /v42-grounded-rear-load-paths-no-display-backplate/)
  assert.doesNotMatch(architectureSource, /<SanctuaryShellMass/)
  assert.doesNotMatch(architectureSource, /v41-integrated-authored-orb-sanctuary-production-candidate/)
  assert.doesNotMatch(architectureSource, /v40-open-apse-authored-orb-production-candidate/)
})

test('live reliquary uses articulated foundation-to-capture-pier-to-vault load paths', () => {
  assert.match(source, /v42-articulated-floor-rooted-capture-pier/)
  assert.match(source, /v42-split-vault-shoulders-continuous-with-articulated-piers/)
  assert.match(source, /v42-machinery-embedded-foundation-sockets-no-platform/)
  assert.match(source, /v42-massive-orb-integrated-with-grounded-lateral-machinery/)
  assert.match(source, /home-orb-engineered-cradle/)
  assert.match(source, /ServiceConduit side=\{-1\}/)
  assert.match(source, /ServiceConduit side=\{1\}/)
  assert.doesNotMatch(source, /<ReliquarySpine\/>/)
})

test('live Orb makes the governed authored GLB massive, visible, and free of display/placeholder centerpiece geometry', () => {
  assert.match(orbSource, /v42-governed-authored-orb-massive-relic-machine-hero/)
  assert.match(orbSource, /primitive object=\{authoredOrb\}/)
  assert.match(orbSource, /scale=\{1\.05\}/)
  assert.match(orbSource, /v42-authored-orb-large-visible-integrated-desktop-mobile/)
  assert.match(orbSource, /v42-engineered-body-is-architectural-capture-system-no-display-ring-no-pedestal/)
  assert.doesNotMatch(orbSource, /RoundedBox/)
  assert.doesNotMatch(orbSource, /torusGeometry/)
  assert.doesNotMatch(orbSource, /dodecahedronGeometry/)
  assert.doesNotMatch(orbSource, /icosahedronGeometry/)
  assert.doesNotMatch(orbSource, /octahedronGeometry/)
  assert.doesNotMatch(orbSource, /sphereGeometry/)
})

test('V42 materially improves literal visual hierarchy and desktop/mobile framing inputs', () => {
  assert.match(source, /gl\.toneMappingExposure=1\.7/)
  assert.match(source, /desiredFov=portrait\?56:50/)
  assert.match(source, /lookHeight=portrait\?2\.18:2\.04/)
  assert.match(source, /ambientLight intensity=\{0\.7\}/)
  assert.match(source, /hemisphereLight args=\{\['#c9ded7','#26322b',0\.98\]\}/)
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
