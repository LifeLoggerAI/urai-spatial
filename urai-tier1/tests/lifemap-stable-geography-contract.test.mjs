import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('Life Map cosmic layout version and seed version are explicit', () => {
  assert.match(source, /const COSMIC_LAYOUT_VERSION = 3/)
  assert.match(source, /const COSMIC_SEED_VERSION = 1/)
})

test('memory coordinates are stable by memory identity rather than array index', () => {
  const fn = source.slice(source.indexOf('function cosmicPoint('), source.indexOf('\n}\n\nfunction truthLabel', source.indexOf('function cosmicPoint(')) + 2)
  assert.match(fn, /function cosmicPoint\(node: LifeMapNode\)/)
  assert.match(fn, /hash\(`v\$\{COSMIC_LAYOUT_VERSION\}:s\$\{COSMIC_SEED_VERSION\}:\$\{node\.id\}:\$\{node\.eraId \|\| "era"\}:\$\{node\.clusterId \|\| node\.type\}`\)/)
  assert.doesNotMatch(fn, /\bindex\b/)
})

test('stable placement preserves real three-axis depth', () => {
  assert.match(source, /const x = Math\.cos\(angle\) \* radius/)
  assert.match(source, /const y = \(seeded\(seed, 11\.7\) - \.5\) \* \(5\.2 \+ radius \* \.17\)/)
  assert.match(source, /const z = -17\.5 - Math\.pow\(seeded\(seed, 14\.9\), \.78\) \* 42/)
})

test('every consumer uses the same cosmic point authority for rendering and camera travel', () => {
  assert.match(source, /positionOverride \?\? cosmicPoint\(node\)/)
  assert.match(source, /new THREE\.Vector3\(\.\.\.cosmicPoint\(selected\)\)/)
  assert.match(source, /selected \? cosmicPoint\(selected\) : null/)
})

test('retired terrain layout authority cannot silently reclaim current geography', () => {
  assert.match(source, /data-life-map-ground="none"/)
  assert.doesNotMatch(source, /lifeMapSpatialLayout|lifeMapLocalPoint|lifeMapTerrainHeight|memoryValley/)
})
