import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ground = readFileSync(new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url), 'utf8')
const groundCanon = readFileSync(new URL('../src/spatial/ground/groundCanon.ts', import.meta.url), 'utf8')

test('Ground renders the current atmospheric lived world instead of the rejected root-vault substrate', () => {
  assert.match(ground, /data-ground-visual-revision="ground-lived-world-v2-canon-lock"/)
  assert.match(ground, /data-ground-art-revision="ground-v25-pbr-terrain-dense-3d-canopy-atmospheric-depth"/)
  assert.match(ground, /data-ground-visual-owner="atmospheric-living-environment"/)
  assert.match(ground, /<AtmosphericGroundSky profile=\{profile\} \/>/)
  assert.match(ground, /<NaturalScatter profile=\{profile\} \/>/)
  assert.match(ground, /<DistantGroundContinuation profile=\{profile\} \/>/)
  assert.match(ground, /const NATURAL_CANOPY = "\/assets\/urai\/generated\/models\/ground-natural-canopy-v3\.glb"/)
  assert.match(ground, /name="ground-authored-natural-canopy-v13"/)
  assert.match(ground, /visibleAuthority: "runtime-authored-canopy-v25"/)
  assert.match(ground, /supersedesVisibleCandidate: "ground-v24-faceted-volume-crown"/)
  assert.match(ground, /literalPixelRepair: "v25-dense-3d-leaflets-mature-canopy-pbr-terrain"/)
  assert.match(ground, /slice\(0, woodland \? 38 : 34\)/)
  assert.doesNotMatch(ground, /new THREE\.IcosahedronGeometry\(0\.5, 0\)/)
  assert.match(ground, /<ScannedRock/)
  assert.match(ground, /<FernPatch/)
  assert.match(ground, /map=\{albedo\}/)
  assert.match(ground, /normalMap=\{normal\}/)
  assert.match(ground, /roughnessMap=\{arm\}/)
  assert.match(ground, /<color attach="background" args=\{\[profile\.horizon\]\} \/>/)
  assert.match(ground, /<fogExp2 attach="fog" args=\{\[profile\.fog, 0\.0062/)
  assert.match(ground, /gl\.toneMappingExposure = 0\.90/)
  assert.match(ground, /data-ground-runtime-owner="first-person-lived-world"/)
  assert.match(ground, /name="ground-lived-world"/)
  assert.match(ground, /name="ground-visible-traversable-terrain"/)
  assert.doesNotMatch(ground, /<GroundSubstrateWorld profile=\{profile\} \/>/)
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
