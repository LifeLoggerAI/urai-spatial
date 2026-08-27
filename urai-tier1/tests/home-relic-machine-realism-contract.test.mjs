import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function', orbStart + 'function SacredOrb('.length)
assert.ok(orbStart >= 0, 'SacredOrb function boundary must remain discoverable')
const orbSource = source.slice(orbStart, orbEnd > orbStart ? orbEnd : source.length)

test('live Home owner is the V37 continuous sanctuary candidate', () => {
  assert.match(source, /v37-continuous-vault-reliquary-sanctuary-candidate/)
  assert.match(source, /function SanctuaryShellMass/)
  assert.match(source, /function ContinuousVaultSkin/)
  assert.match(source, /function CantedWallMass/)
  assert.match(source, /function MachineCavityLiner/)
})

test('live reliquary is architecturally integrated rather than a pedestal display', () => {
  assert.match(source, /function ReliquaryWing/)
  assert.match(source, /function CrownBridge/)
  assert.match(source, /function FloorReliquaryBed/)
  assert.match(source, /function ServiceConduit/)
  assert.match(source, /home-orb-engineered-cradle/)
  assert.doesNotMatch(orbSource, /sphereGeometry/)
})

test('live reliquary exposes layered faceted machinery and restrained machine light', () => {
  assert.match(orbSource, /octahedronGeometry/)
  assert.match(orbSource, /icosahedronGeometry/)
  assert.match(orbSource, /dodecahedronGeometry/)
  assert.match(orbSource, /meshPhysicalMaterial/)
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
