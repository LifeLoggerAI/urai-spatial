import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionSacred.tsx', import.meta.url), 'utf8')
const lifeMapPortalStart = source.indexOf('function LifeMapPortal(')
const lifeMapPortalEnd = source.indexOf('function Thresholds(', lifeMapPortalStart)
assert.ok(lifeMapPortalStart >= 0 && lifeMapPortalEnd > lifeMapPortalStart, 'LifeMapPortal function boundary must remain discoverable')
const lifeMapPortalSource = source.slice(lifeMapPortalStart, lifeMapPortalEnd)

test('Sacred Home Orb is a restrained physical relic-machine rather than a simple glowing sphere', () => {
  assert.match(source, /premium-moonlit-relic-machine-v16/)
  assert.match(source, /home-orb-stabilizer-ring-1/)
  assert.match(source, /home-orb-stabilizer-ring-2/)
  assert.match(source, /home-orb-stabilizer-ring-3/)
  assert.match(source, /home-orb-crystalline-fragments/)
  assert.match(source, /home-orb-state-light/)
  assert.match(source, /home-orb-non-spherical-core/)
  assert.doesNotMatch(source, /sphereGeometry args=\{\[0\.34,56,56\]\}/)
})

test('Life Map threshold visibly consumes the governed authored portal as physical architecture', () => {
  assert.match(lifeMapPortalSource, /home-life-map-portal-authored-visible/)
  assert.match(lifeMapPortalSource, /authored-portal-physical-threshold-v16/)
  assert.match(lifeMapPortalSource, /<primitive object=\{model\} \/>/)
  assert.doesNotMatch(lifeMapPortalSource, /<primitive object=\{model\} visible=\{false\}/)
})

test('Home hero materials use governed photographic PBR and local HDR rather than generated texture stand-ins', () => {
  assert.match(source, /HOME_PHOTOGRAPHIC_PBR_V16/)
  assert.match(source, /rock-tile-floor-diff-1k\.png/)
  assert.match(source, /rock-tile-floor-normal-gl-1k\.png/)
  assert.match(source, /rock-tile-floor-arm-1k\.png/)
  assert.match(source, /rock-tile-floor-displacement-1k\.png/)
  assert.match(source, /studio-small-08-1k\.hdr/)
  assert.match(source, /photographic-rock-pbr-v16/)
  assert.match(source, /photographic-obsidian-ritual-platform-v16/)
  assert.match(source, /hand-laid-photographic-stone-v16/)
  assert.match(source, /local-cc0-hdri-studio-small-08/)
  assert.doesNotMatch(source, /new THREE\.DataTexture/)
  assert.doesNotMatch(source, /makeWeatheredStonePack/)
  assert.doesNotMatch(source, /configureSurfaceTexture/)
  assert.doesNotMatch(source, /<Lightformer/)
})

test('Home environment follows the final photographic sanctuary direction from the Final Asset Lock', () => {
  assert.match(source, /fog-carried-horizon-without-procedural-ridges-v15/)
  assert.match(source, /photographic-blue-hour-haze-v15/)
  assert.match(source, /recessed-obsidian-descent-v16/)
  assert.match(source, /low-density-depth-mist-v15/)
  assert.match(source, /perimeter-only-scanned-growth-v15/)
  assert.match(source, /\{cosmic\?<Stars/)
  assert.doesNotMatch(source, /home-natural-walkable-terrain/)
  assert.doesNotMatch(source, /vec3 lightDirection/)
  assert.doesNotMatch(source, /icosahedronGeometry/)
  assert.doesNotMatch(source, /makeRidgeGeometry/)
  assert.doesNotMatch(source, /function Lantern/)
})

test('normal Home no longer exposes the rejected demo-landscape grammar', () => {
  assert.doesNotMatch(source, /dense-atmospheric-ridges-v14/)
  assert.doesNotMatch(source, /weathered-obsidian-ground-v14/)
  assert.doesNotMatch(source, /grounded-basalt-descent-v14/)
  assert.doesNotMatch(source, /home-distant-natural-horizon[\s\S]*mesh geometry=/)
  assert.match(source, /data-home-visual-grade="cinematic-pbr-v16-photographic-cc0-sanctuary"/)
})

test('moon presentation is physical and no longer built from an overlapping dark-sphere cutout', () => {
  assert.match(source, /home-physical-moon/)
  assert.doesNotMatch(source, /position=\{\[0\.34,0\.05,0\.22\]\}/)
})
