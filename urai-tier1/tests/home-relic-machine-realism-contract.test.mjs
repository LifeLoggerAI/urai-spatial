import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart, 'SacredOrb function boundary must remain discoverable')
const orbSource = source.slice(orbStart, orbEnd)

test('live Home owner is the current integrated production sanctuary candidate', () => {
  assert.match(source, /v39-authored-core-load-path-sanctuary-production-candidate/)
  assert.match(source, /function SanctuaryShellMass/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /function CantedWallMass/)
  assert.match(source, /function MachineCavityLiner/)
})

test('live reliquary carries loads from floor through piers into the vault crown', () => {
  assert.match(source, /function ReliquarySpine/)
  assert.match(source, /v39-recessed-bearing-machine-spine/)
  assert.match(source, /v39-floor-to-vault-bearing-pier-no-floating-jaw/)
  assert.match(source, /v39-structural-vault-crown-direct-pier-bearing/)
  assert.match(source, /v39-recessed-floor-service-trench-no-plinth/)
  assert.match(source, /v39-direct-floor-pier-crown-bearing-frame/)
  assert.match(source, /home-orb-engineered-cradle/)
})

test('live Orb uses the governed authored core inside an armored machine instead of procedural placeholder polyhedra', () => {
  assert.match(orbSource, /v39-governed-authored-core-inside-load-bearing-reliquary/)
  assert.match(orbSource, /primitive object=\{authoredOrb\}/)
  assert.match(orbSource, /home-orb-engineered-body/)
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
