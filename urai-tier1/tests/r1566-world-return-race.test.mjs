import test from 'node:test'
import assert from 'node:assert/strict'
import { claimWorldReturn } from '../src/spatial/world/worldReturnGuard.ts'

test('only first same-tick return claims the pending navigation', () => {
  const phase = { current: 'idle' }
  assert.equal(claimWorldReturn(phase), true)
  assert.equal(phase.current, 'travelling')
  assert.equal(claimWorldReturn(phase), false)
})
test('duplicate return burst never claims again before route sync', () => {
  const phase = { current: 'idle' }
  assert.equal([claimWorldReturn(phase), ...Array.from({length: 32}, () => claimWorldReturn(phase))].filter(Boolean).length, 1)
})
test('provider route sync to idle permits the next completed journey', () => {
  const phase = { current: 'idle' }
  assert.equal(claimWorldReturn(phase), true)
  phase.current = 'idle'
  assert.equal(claimWorldReturn(phase), true)
})
test('all other active transition phases reject new return requests', () => {
  for (const name of ['descending', 'ascending', 'travelling']) {
    const phase = { current: name }
    assert.equal(claimWorldReturn(phase), false)
    assert.equal(phase.current, name)
  }
})
