import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
assert.ok(orbStart >= 0 && orbEnd > orbStart, 'SacredOrb function boundary must remain discoverable')
const orbSource = source.slice(orbStart, orbEnd)

test('live Home owner is the V38 integrated machine sanctuary candidate', () => {
  assert.match(source, /v38-integrated-machine-sanctuary-production-candidate/)
  assert.match(source, /function SanctuaryShellMass/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /function CantedWallMass/)
  assert.match(source, /function MachineCavityLiner/)
})

test('live reliquary carries loads from floor through piers into the vault crown', () => {
  assert.match(source, /function ReliquarySpine/)
  assert.match(source, /v38-floor-to-vault-load-bearing-reliquary-pier/)
  assert.match(source, /v38-structural-vault-crown/)
  assert.match(source, /v38-recessed-floor-service-integration-no-plinth/)
  assert.match(source, /v38-recessed-service-trunk/)
  assert.match(source, /home-orb-engineered-cradle/)
})

test('live Orb is a recessed armored memory core instead of a pedestal sphere or spindle', () => {
  assert.match(orbSource, /v38-recessed-armored-memory-core-inside-load-bearing-reliquary/)
  assert.match(orbSource, /dodecahedronGeometry/)
  assert.match(orbSource, /icosahedronGeometry/)
  assert.match(orbSource, /octahedronGeometry/)
  assert.doesNotMatch(orbSource, /sphereGeometry/)
  assert.doesNotMatch(orbSource, /cylinderGeometry/)
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
