import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart, 'SacredOrb function boundary must remain discoverable')
const orbSource = source.slice(orbStart, orbEnd)

test('live Home owner is the V40 open apse production sanctuary candidate', () => {
  assert.match(source, /v40-open-apse-authored-orb-production-candidate/)
  assert.match(source, /function SanctuaryShellMass/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /v40-wide-open-rear-apse-no-oversized-wall-slabs/)
  assert.match(source, /v40-recessed-buttress-outside-hero-sightline/)
  assert.match(source, /v40-open-machined-apse-liner-no-egg-backplate/)
})

test('live reliquary is architectural floor-pier-crown structure without a cage or display platform', () => {
  assert.match(source, /function ReliquarySpine/)
  assert.match(source, /v40-open-apse-bearing-arch-no-solid-backplate/)
  assert.match(source, /v40-floor-rooted-tapered-pier-no-bar-cage/)
  assert.match(source, /v40-continuous-crown-seated-on-tapered-piers/)
  assert.match(source, /v40-flush-recessed-service-seam-no-platform/)
  assert.match(source, /v40-floor-piers-crown-without-cage-or-pedestal/)
  assert.match(source, /home-orb-engineered-cradle/)
})

test('live Orb makes the governed authored GLB the primary hero and removes procedural placeholder polyhedra/cage bars', () => {
  assert.match(orbSource, /v40-governed-authored-orb-primary-hero-inside-open-architectural-apse/)
  assert.match(orbSource, /primitive object=\{authoredOrb\}/)
  assert.match(orbSource, /scale=\{\.072\}/)
  assert.match(orbSource, /v40-recessed-retention-collar-not-display-cage/)
  assert.doesNotMatch(orbSource, /RoundedBox/)
  assert.doesNotMatch(orbSource, /dodecahedronGeometry/)
  assert.doesNotMatch(orbSource, /icosahedronGeometry/)
  assert.doesNotMatch(orbSource, /octahedronGeometry/)
  assert.doesNotMatch(orbSource, /sphereGeometry/)
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
