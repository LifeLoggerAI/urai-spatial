import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionSacred.tsx', import.meta.url), 'utf8')

test('Sacred Home Orb is a restrained physical relic-machine rather than a simple glowing sphere', () => {
  assert.match(source, /premium-moonlit-relic-machine-v14/)
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
  assert.match(source, /authored-portal-physical-threshold-v14/)
  assert.doesNotMatch(source, /<primitive object=\{model\} visible=\{false\}/)
})

test('Home environment follows the rejected-green replacement direction from the Final Asset Lock', () => {
  assert.match(source, /weathered-obsidian-ground-v14/)
  assert.match(source, /obsidian-ritual-platform-v14/)
  assert.match(source, /dense-atmospheric-ridges-v14/)
  assert.match(source, /premium-blue-hour-obsidian-v14/)
  assert.match(source, /grounded-basalt-descent-v14/)
  assert.match(source, /\{cosmic\?<Stars/)
  assert.doesNotMatch(source, /home-natural-walkable-terrain/)
  assert.doesNotMatch(source, /vec3 lightDirection/)
  assert.doesNotMatch(source, /icosahedronGeometry/)
})

test('moon presentation is physical and no longer built from an overlapping dark-sphere cutout', () => {
  assert.match(source, /home-physical-moon/)
  assert.doesNotMatch(source, /position=\{\[0\.34,0\.05,0\.22\]\}/)
})
