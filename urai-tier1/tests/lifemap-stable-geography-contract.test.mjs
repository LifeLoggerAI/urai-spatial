import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LIFE_MAP_LAYOUT_VERSION,
  LIFE_MAP_SEED_VERSION,
  lifeMapLocalPoint,
} from '../src/components/lifemap/lifeMapSpatialLayout.ts'

const baseNodes = [
  {
    id: 'alpha-memory',
    title: 'Alpha', subtitle: '', summary: '', type: 'memory', position: [0, 0, 0], intensity: .7,
    aura: '#ffffff', dateLabel: 'Now', replayAvailable: true, connectedTo: ['beta-memory'],
    eraId: 'spring-becoming', clusterId: 'cluster-a', privacyLevel: 'private',
  },
  {
    id: 'beta-memory',
    title: 'Beta', subtitle: '', summary: '', type: 'relationship', position: [0, 0, 0], intensity: .6,
    aura: '#ffffff', dateLabel: 'Then', replayAvailable: true, connectedTo: ['alpha-memory'],
    eraId: 'relationship-orbit', clusterId: 'cluster-b', privacyLevel: 'private',
  },
  {
    id: 'gamma-memory',
    title: 'Gamma', subtitle: '', summary: '', type: 'recovery', position: [0, 0, 0], intensity: .8,
    aura: '#ffffff', dateLabel: 'After', replayAvailable: true, connectedTo: [],
    eraId: 'threshold-return', clusterId: 'cluster-c', privacyLevel: 'private',
  },
]

function coordinateMap(nodes) {
  return Object.fromEntries(nodes.map((node, index) => [node.id, lifeMapLocalPoint(node, index)]))
}

test('Life Map v3 layout version is explicit and nonzero', () => {
  assert.equal(LIFE_MAP_LAYOUT_VERSION, 3)
  assert.ok(LIFE_MAP_SEED_VERSION >= 1)
})

test('memory coordinates do not depend on array index', () => {
  for (const node of baseNodes) {
    const expected = lifeMapLocalPoint(node, 0)
    for (const index of [1, 2, 7, 47, 9999]) {
      assert.deepEqual(lifeMapLocalPoint(node, index), expected, `${node.id} moved at array index ${index}`)
    }
  }
})

test('shuffling source query order preserves learned geography exactly', () => {
  const original = coordinateMap(baseNodes)
  const reversed = coordinateMap([...baseNodes].reverse())
  const rotated = coordinateMap([baseNodes[1], baseNodes[2], baseNodes[0]])
  for (const node of baseNodes) {
    assert.deepEqual(reversed[node.id], original[node.id], `${node.id} moved after reverse`)
    assert.deepEqual(rotated[node.id], original[node.id], `${node.id} moved after rotation`)
  }
})

test('incremental insertion does not move committed memories', () => {
  const original = coordinateMap(baseNodes)
  const inserted = {
    id: 'new-memory',
    title: 'New', subtitle: '', summary: '', type: 'memory', position: [0, 0, 0], intensity: .5,
    aura: '#ffffff', dateLabel: 'New', replayAvailable: false, connectedTo: [],
    eraId: 'spring-becoming', clusterId: 'cluster-a', privacyLevel: 'private',
  }
  const expanded = coordinateMap([inserted, ...baseNodes])
  for (const node of baseNodes) {
    assert.deepEqual(expanded[node.id], original[node.id], `${node.id} moved when a new memory was inserted`)
  }
})

test('deletion does not move surviving memories', () => {
  const original = coordinateMap(baseNodes)
  const survivors = coordinateMap([baseNodes[2], baseNodes[0]])
  assert.deepEqual(survivors['alpha-memory'], original['alpha-memory'])
  assert.deepEqual(survivors['gamma-memory'], original['gamma-memory'])
})
