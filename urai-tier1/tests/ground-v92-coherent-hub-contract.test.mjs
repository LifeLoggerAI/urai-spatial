import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ground = readFileSync(new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url), 'utf8')

test('Ground renders an authored spatial vault instead of an image-backed hub', () => {
  assert.match(ground, /data-ground-visual-revision="walkable-stone-vault-and-enterable-chambers-candidate"/)
  assert.match(ground, /<GroundVaultArchitecture/)
  assert.doesNotMatch(ground, /<picture|operations-world-main\.webp|operations-world-mobile\.webp/)
})

test('V92 keeps the governed GLB bound but non-rendering and preserves navigation semantics', () => {
  assert.match(ground, /<primitive object=\{world\} visible=\{false\}/)
  assert.match(ground, /ground-walkable-navigation-surface/)
  assert.match(ground, /data-ground-enterable-thresholds=/)
  assert.match(ground, /ground-destination-compass/)
  assert.match(ground, /useGLTF\.preload\(GROUND_MODEL\)/)
})

test('Ground has one opaque Canvas with physical background ownership', () => {
  assert.match(ground, /alpha: false/)
  assert.match(ground, /gl\.setClearColor\(0x101d20, 1\)/)
  assert.match(ground, /scene\.background = new THREE\.Color/)
  assert.match(ground, /ground-v92-retired-solid-background/)
  assert.match(ground, /<mesh visible=\{false\}[^>]*ground-v41-continuous-architectural-underfloor/)
  assert.match(ground, /ground-authored-architectural-route-lighting" visible=\{false\}/)
  assert.equal((ground.match(/<Canvas/g) || []).length, 1)
})
