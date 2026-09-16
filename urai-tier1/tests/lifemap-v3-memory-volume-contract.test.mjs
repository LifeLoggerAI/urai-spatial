import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const stellar = fs.readFileSync(new URL('../src/components/lifemap/LifeMapStellarField.tsx', import.meta.url), 'utf8')
const visualSystem = fs.readFileSync(new URL('../src/components/lifemap/lifeMapVisualSystem.ts', import.meta.url), 'utf8')

test('live stellar owner declares asymmetric v3 memory-volume authority', () => {
  assert.match(stellar, /life-map-v3-memory-volume-/)
  assert.match(stellar, /asymmetric-luminous-memory-volume/)
  assert.match(stellar, /v3-no-planet-no-ring-memory-language/)
})

test('selected memory presentation does not regress to orbital rings', () => {
  assert.doesNotMatch(stellar, /torusGeometry/)
  assert.doesNotMatch(stellar, /solar-system|planet-like-memory/i)
})

test('memory visual seed no longer depends on source array index', () => {
  assert.match(stellar, /function nodeSeed\(node: LifeMapNode\)/)
  assert.doesNotMatch(stellar, /index \* 37/)
  assert.match(stellar, /node\.id/)
  assert.match(stellar, /node\.eraId/)
  assert.match(stellar, /node\.clusterId/)
})

test('unknown chapter fallback is stable by memory identity rather than array position', () => {
  assert.match(visualSystem, /function stableChapterIndex\(node: LifeMapNode\)/)
  assert.doesNotMatch(visualSystem, /LIFE_MAP_CHAPTERS\[index % LIFE_MAP_CHAPTERS\.length\]/)
})
