import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ground = readFileSync(new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url), 'utf8')

test('V92 replaces the rejected primitive Ground pixels with committed desktop and portrait hub art', () => {
  assert.match(ground, /data-ground-visual-revision="v92-coherent-operations-hub"/)
  assert.match(ground, /operations-world-main\.webp/)
  assert.match(ground, /operations-world-mobile\.webp/)
  assert.match(ground, /object-fit:cover/)
  assert.match(ground, /object-position:center/)
})

test('V92 keeps the governed GLB bound but non-rendering and preserves navigation semantics', () => {
  assert.match(ground, /<primitive object=\{world\} visible=\{false\}/)
  assert.match(ground, /ground-walkable-navigation-surface/)
  assert.match(ground, /data-ground-enterable-thresholds=/)
  assert.match(ground, /ground-destination-compass/)
  assert.match(ground, /useGLTF\.preload\(GROUND_MODEL\)/)
})

test('V92 composites interaction in a transparent single Canvas without the rejected stage', () => {
  assert.match(ground, /alpha: true/)
  assert.match(ground, /gl\.setClearColor\(0x000000, 0\)/)
  assert.match(ground, /scene\.background = null/)
  assert.match(ground, /ground-v92-retired-solid-background/)
  assert.match(ground, /<mesh visible=\{false\}[^>]*ground-v41-continuous-architectural-underfloor/)
  assert.match(ground, /ground-authored-architectural-route-lighting" visible=\{false\}/)
  assert.equal((ground.match(/<Canvas/g) || []).length, 1)
})
