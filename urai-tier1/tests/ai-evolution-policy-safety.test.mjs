import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deterministicEvolutionPolicy,
  normalizeEvolutionContext,
  validateEvolutionAction,
} from '../src/ai/aiEvolutionPolicy.ts'

test('normalizes malformed evolution context before policy use', () => {
  const normalized = normalizeEvolutionContext({
    historyLength: -9.7,
    branchCount: Number.POSITIVE_INFINITY,
    density: 4,
    anomalyScore: -2,
    time: Number.NaN,
  })

  assert.deepEqual(normalized, {
    historyLength: 0,
    branchCount: 0,
    density: 1,
    anomalyScore: 0,
  })
})

test('accepts only contract-valid model actions', () => {
  const ctx = normalizeEvolutionContext({
    historyLength: 20,
    branchCount: 2,
    density: 0.3,
    anomalyScore: 0.1,
  })

  assert.deepEqual(validateEvolutionAction({ type: 'none' }, ctx), { type: 'none' })
  assert.deepEqual(validateEvolutionAction({ type: 'synthesize' }, ctx), { type: 'synthesize' })
  assert.deepEqual(validateEvolutionAction({ type: 'fork', index: 3 }, ctx), { type: 'fork', index: 3 })
  assert.deepEqual(validateEvolutionAction({ type: 'merge', a: 'left', b: 'right' }, ctx), {
    type: 'merge',
    a: 'left',
    b: 'right',
  })
})

test('rejects unsupported or unsafe model actions', () => {
  const ctx = normalizeEvolutionContext({
    historyLength: 4,
    branchCount: 2,
    density: 0.3,
  })

  assert.equal(validateEvolutionAction(null, ctx), null)
  assert.equal(validateEvolutionAction({ type: 'delete-memory' }, ctx), null)
  assert.equal(validateEvolutionAction({ type: 'fork', index: -1 }, ctx), null)
  assert.equal(validateEvolutionAction({ type: 'fork', index: 4 }, ctx), null)
  assert.equal(validateEvolutionAction({ type: 'fork', index: 1.5 }, ctx), null)
  assert.equal(validateEvolutionAction({ type: 'merge', a: '', b: 'right' }, ctx), null)
  assert.equal(validateEvolutionAction({ type: 'merge', a: 'x'.repeat(129), b: 'right' }, ctx), null)
})

test('deterministic fallback remains stable across representative boundaries', () => {
  assert.deepEqual(
    deterministicEvolutionPolicy({ historyLength: 30, branchCount: 1, density: 0.2, anomalyScore: 0.1 }),
    { type: 'fork', index: 25 },
  )

  assert.deepEqual(
    deterministicEvolutionPolicy({ historyLength: 10, branchCount: 7, density: 0.5, anomalyScore: 0.2 }),
    { type: 'merge', a: 'auto', b: 'auto' },
  )

  assert.deepEqual(
    deterministicEvolutionPolicy({ historyLength: 10, branchCount: 1, density: 0.2, anomalyScore: 0.9 }),
    { type: 'synthesize' },
  )

  assert.deepEqual(
    deterministicEvolutionPolicy({ historyLength: 10, branchCount: 1, density: 0.2, anomalyScore: 0.1 }),
    { type: 'none' },
  )
})
