import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTier1CanonShape } from '../src/canon/tier1.schema.ts'

test('tier1 canon schema validation', () => {
  const result = validateTier1CanonShape()
  assert.equal(result.ok, true, result.errors.join('; '))
})
