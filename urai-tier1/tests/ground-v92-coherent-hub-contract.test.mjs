import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ground = readFileSync(new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url), 'utf8')
const groundCanon = readFileSync(new URL('../src/spatial/ground/groundCanon.ts', import.meta.url), 'utf8')

test('Ground renders a lived physical world instead of the retired chamber hub', () => {
  assert.match(ground, /data-ground-visual-revision="ground-lived-world-v2-canon-lock"/)
  assert.match(ground, /data-ground-art-revision="ground-natural-canopy-v3-authored-ridge-v3"/)
  assert.match(ground, /data-ground-runtime-owner="first-person-lived-world"/)
  assert.match(ground, /name="ground-lived-world"/)
  assert.match(ground, /name="ground-visible-traversable-terrain"/)
  assert.doesNotMatch(ground, /GroundPhysicalArchitecture|GroundVaultArchitecture|ground-destination-compass|ground-central-nexus/)
})

test('Ground uses true eye-level terrain-following first-person movement', () => {
  assert.match(groundCanon, /export const GROUND_EYE_HEIGHT_M = 1\.69/)
  assert.match(ground, /groundHeight\(position\.current\.x, position\.current\.z, profile\.id\)/)
  assert.match(ground, /desired\.current\.set\(position\.current\.x, surfaceY \+ GROUND_EYE_HEIGHT_M, position\.current\.z\)/)
  assert.match(ground, /data-ground-camera="eye-level-terrain-following-no-authored-bob"/)
  assert.match(ground, /data-ground-collision="terrain-plus-authored-obstacle-field"/)
  assert.match(ground, /stepEmbodiedMotion/)
  assert.match(ground, /buildGroundObstacleField\(profile\.id\)/)
  assert.doesNotMatch(ground, /cameraOffset|distance = portrait \? 1\.4 : 1\.1/)
})

test('Visible terrain owns traversal and private place data remains fail-closed by default', () => {
  assert.match(ground, /onClick=\{onTerrainClick\}/)
  assert.match(ground, /event\.delta > 8/)
  assert.match(ground, /data-ground-place-layer="consent-aware-empty-by-default"/)
  assert.match(ground, /data-ground-private-location-mounted="false"/)
  assert.match(ground, /href="\/location-map\/geographic\/"/)
  assert.match(ground, /href="\/privacy-controls"/)
  assert.doesNotMatch(ground, /ground-walkable-navigation-surface|planeGeometry args=\{\[30, 44\]\}/)
})

test('Ground preserves one adaptive opaque Canvas and five physical environment profiles', () => {
  assert.equal((ground.match(/<Canvas/g) || []).length, 1)
  assert.match(ground, /alpha: false/)
  for (const profile of ['temperate', 'urban', 'woodland', 'arid', 'coastal']) {
    assert.match(ground, new RegExp(`${profile}: \\{ id: "${profile}"`))
  }
  assert.match(ground, /MobileMovementPad input=\{input\} label="Ground first-person movement controls"/)
})
