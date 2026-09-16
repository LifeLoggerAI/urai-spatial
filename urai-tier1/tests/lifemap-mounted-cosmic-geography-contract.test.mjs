import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const canonical = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')

test('persistent Life Map mounts the Cosmic owner guarded by this contract', () => {
  assert.match(canonical, /LifeMapRouteBoundary/)
  assert.match(canonical, /<LifeMapRouteBoundary\s*\/>/)
  assert.match(boundary, /import ComposedLifeMapScene from ['"]\.\/CosmicComposedLifeMapScene['"]/)
  assert.match(boundary, /<ComposedLifeMapScene\s*\/>/)
})

test('mounted Cosmic memory coordinates are stable across source array ordering', () => {
  assert.match(cosmic, /const COSMIC_LAYOUT_VERSION = 3;/)
  assert.match(cosmic, /const COSMIC_SEED_VERSION = 1;/)
  assert.match(cosmic, /function cosmicPoint\(node: LifeMapNode, _index: number\): Point3/)
  assert.match(cosmic, /v\$\{COSMIC_LAYOUT_VERSION\}:s\$\{COSMIC_SEED_VERSION\}:\$\{node\.id\}/)
  assert.match(cosmic, /seeded\(seed, 17\.41\)/)

  const body = cosmic.match(/function cosmicPoint\([\s\S]*?\n\}/)?.[0] || ''
  assert.ok(body, 'cosmicPoint body must remain inspectable')
  assert.doesNotMatch(body, /\$\{index\}/)
  assert.doesNotMatch(body, /index\s*%/)
  assert.doesNotMatch(body, /seeded\(index/)
})

test('selected memory formation is seeded from stable memory identity, not array index', () => {
  assert.match(cosmic, /SelectedMemoryFormation point=\{point\} aura=\{node\.aura\} phase=\{phase\} index=\{hash\(node\.id\) % 997\}/)
  assert.doesNotMatch(cosmic, /SelectedMemoryFormation point=\{point\} aura=\{node\.aura\} phase=\{phase\} index=\{index\}/)
})
