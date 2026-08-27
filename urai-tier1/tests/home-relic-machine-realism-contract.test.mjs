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

test('live Home owner is the V41 integrated authored-Orb sanctuary candidate', () => {
  assert.match(source, /v41-integrated-authored-orb-sanctuary-production-candidate/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /v41-asymmetric-recessed-structural-buttresses/)
  assert.match(source, /v41-separated-recessed-machine-shoulders-no-arch-no-backplate/)
  assert.match(source, /v41-single-continuous-vault-skin-over-open-center/)
  assert.doesNotMatch(architectureSource, /<SanctuaryShellMass/)
  assert.doesNotMatch(architectureSource, /v40-open-apse-authored-orb-production-candidate/)
})

test('live reliquary uses a foundation-to-lateral-pier-to-vault load path with an open center', () => {
  assert.match(source, /v41-foundation-rooted-heavy-lateral-pier/)
  assert.match(source, /v41-split-vault-shoulders-no-center-bridge/)
  assert.match(source, /v41-recessed-foundation-sockets-no-platform/)
  assert.match(source, /v41-open-center-no-spine-no-ring-no-pedestal/)
  assert.match(source, /home-orb-engineered-cradle/)
  assert.doesNotMatch(source, /<ReliquarySpine\/>/)
})

test('live Orb makes the governed authored GLB the visible hero and removes display/placeholder centerpiece geometry', () => {
  assert.match(orbSource, /v41-governed-authored-orb-primary-architectural-hero/)
  assert.match(orbSource, /primitive object=\{authoredOrb\}/)
  assert.match(orbSource, /scale=\{\.17\}/)
  assert.match(orbSource, /v41-engineered-reliquary-is-lateral-architecture-no-display-ring/)
  assert.doesNotMatch(orbSource, /RoundedBox/)
  assert.doesNotMatch(orbSource, /torusGeometry/)
  assert.doesNotMatch(orbSource, /dodecahedronGeometry/)
  assert.doesNotMatch(orbSource, /icosahedronGeometry/)
  assert.doesNotMatch(orbSource, /octahedronGeometry/)
  assert.doesNotMatch(orbSource, /sphereGeometry/)
})

test('V41 improves literal visual readability and desktop/mobile framing inputs', () => {
  assert.match(source, /gl\.toneMappingExposure=1\.62/)
  assert.match(source, /desiredFov=portrait\?58:54/)
  assert.match(source, /lookHeight=portrait\?1\.72:1\.48/)
  assert.match(source, /ambientLight intensity=\{0\.64\}/)
  assert.match(source, /hemisphereLight args=\{\['#c1d8d0','#202a24',0\.88\]\}/)
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
