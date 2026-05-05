import test from 'node:test'
import assert from 'node:assert/strict'
import { TIER1_CANON_VERSION, TIER1_HOME_INVARIANT, TIER1_PHASE_CHAIN, TIER1_ESC_UNWIND_CHAIN, TIER1_ROUTES } from '../src/canon/tier1.ts'

test('tier1 canon snapshot', () => {
  assert.equal(TIER1_CANON_VERSION, '1.0.0')
  assert.deepEqual(TIER1_PHASE_CHAIN, ['HOME', 'ASCENT', 'LIFEMAP', 'FOCUS', 'REPLAY'])
  assert.deepEqual(TIER1_ESC_UNWIND_CHAIN, ['REPLAY', 'FOCUS', 'LIFEMAP', 'HOME'])
  assert.equal(TIER1_HOME_INVARIANT.noText, true)
  assert.equal(TIER1_ROUTES.lifeMap, '/life-map')
})
