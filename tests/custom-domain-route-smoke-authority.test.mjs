import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCanonicalProtectedRevision } from '../scripts/verify-custom-domain-deployed-sha-authority.mjs'

const canonicalSha = '0123456789abcdef0123456789abcdef01234567'
const nonCanonicalSha = 'fedcba9876543210fedcba9876543210fedcba98'

test('accepts a well-formed revision only when it resolves and is contained in canonical main history', () => {
  const accepted = assertCanonicalProtectedRevision(canonicalSha, {
    resolves: (sha) => sha === canonicalSha,
    isAncestorOfMain: (sha) => sha === canonicalSha,
  })
  assert.equal(accepted, canonicalSha)
})

test('rejects a well-formed but non-canonical revision', () => {
  assert.throws(
    () => assertCanonicalProtectedRevision(nonCanonicalSha, {
      resolves: () => true,
      isAncestorOfMain: () => false,
    }),
    /not contained in canonical origin\/main history/,
  )
})

test('rejects a 40-character value that is not hexadecimal before authority lookup', () => {
  let consulted = false
  assert.throws(
    () => assertCanonicalProtectedRevision('z'.repeat(40), {
      resolves: () => { consulted = true; return true },
      isAncestorOfMain: () => { consulted = true; return true },
    }),
    /exactly 40 hexadecimal characters/,
  )
  assert.equal(consulted, false)
})

test('rejects a well-formed SHA that does not resolve to a commit', () => {
  assert.throws(
    () => assertCanonicalProtectedRevision(nonCanonicalSha, {
      resolves: () => false,
      isAncestorOfMain: () => true,
    }),
    /does not resolve to a repository commit/,
  )
})
