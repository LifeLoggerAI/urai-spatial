import test from 'node:test'
import assert from 'node:assert/strict'
import { referenceEstateShard } from '../scripts/reference-estate-shards.mjs'

test('every planned capture appears in exactly one shard with unchanged configuration', () => {
  const states = Array.from({ length: 173 }, (_, id) => ({ id: `case-${id}`, route: `/route-${id}`, action() {} }))
  const selected = []
  for (let index = 0; index < 4; index++) {
    const shard = referenceEstateShard(states, String(index), '4')
    assert.equal(shard.plan.totalPlanned, states.length)
    assert.deepEqual(shard.plan.allPlannedIds, states.map(state => state.id))
    selected.push(...shard.selected)
  }
  assert.equal(new Set(selected).size, states.length)
  assert.equal(selected.length, states.length)
  assert.ok(states.every(state => selected.includes(state)))
  assert.deepEqual(referenceEstateShard(states).selected, states)
})

test('invalid or empty shard and duplicate IDs fail closed', () => {
  for (const [index, count] of [['4', '4'], ['-1', '4'], ['1.5', '4'], ['0', '0'], ['0', '17'], ['bad', '4'], ['0', 'NaN']]) {
    assert.throws(() => referenceEstateShard([{ id: 'a' }], index, count))
  }
  assert.throws(() => referenceEstateShard([{ id: 'a' }], '1', '4'))
  assert.throws(() => referenceEstateShard([{ id: 'a' }, { id: 'a' }]))
})
