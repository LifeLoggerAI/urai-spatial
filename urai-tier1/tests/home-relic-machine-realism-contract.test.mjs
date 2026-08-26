import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionSacred.tsx', import.meta.url), 'utf8')

test('Sacred Home Orb is a restrained physical relic-machine rather than a simple glowing sphere', () => {
  assert.match(source, /premium-moonlit-relic-machine-v15/)
  assert.match(source, /home-orb-stabilizer-ring-1/)
  assert.match(source, /home-orb-stabilizer-ring-2/)
  assert.match(source, /home-orb-stabilizer-ring-3/)
  assert.match(source, /home-orb-crystalline-fragments/)
  assert.match(source, /home-orb-state-light/)
  assert.match(source, /home-orb-non-spherical-core/)
  assert.doesNotMatch(source, /sphereGeometry args=\{\[0\.34,56,56\]\}/)
})

test('Life Map threshold visibly consumes the governed authored portal as physical architecture', () => {
  assert.match(source, /home-life-map-portal-authored-visible/)
  assert.match(source, /authored-portal-physical-threshold-v15/)
  assert.doesNotMatch(source, /<primitive object=\{model\} visible=\{false\}/)
})

test('Home environment follows the final photographic sanctuary direction from the Final Asset Lock', () => {
  assert.match(source, /weathered-obsidian-microdetail-v15/)
  assert.match(source, /photographic-obsidian-ritual-platform-v15/)
  assert.match(source, /fog-carried-horizon-without-procedural-ridges-v15/)
  assert.match(source, /photographic-blue-hour-haze-v15/)
  assert.match(source, /recessed-obsidian-descent-v15/)
  assert.match(source, /low-density-depth-mist-v15/)
  assert.match(source, /hand-laid-weathered-stone-v15/)
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
  assert.match(source, /data-home-visual-grade="cinematic-pbr-v15-photographic-sanctuary"/)
})

test('moon presentation is physical and no longer built from an overlapping dark-sphere cutout', () => {
  assert.match(source, /home-physical-moon/)
  assert.doesNotMatch(source, /position=\{\[0\.34,0\.05,0\.22\]\}/)
})
