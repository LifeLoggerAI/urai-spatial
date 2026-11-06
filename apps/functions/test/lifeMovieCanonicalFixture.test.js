'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { canonicalPolicy, isCanonicalStoredPolicy } = require('./lifeMovieCanonicalFixture.cjs')
const uid = 'fictionalOwner'
test('exact canonical policy shape is recognized by actual production validator', () => {
  assert.equal(isCanonicalStoredPolicy(canonicalPolicy(uid), uid), true)
})
test('old Life Movie fixture is NOT accepted by original validator', () => {
  const invalid = { version: 2, revision: 4, ownerId: uid,
    domains: { memory: { mode: 'granted', replayVisible: true, lifeMapVisible: true } },
    enforcement: { state: 'fully-enforced' },
  }
  assert.equal(isCanonicalStoredPolicy(invalid, uid), false)
})
test('six domains plus complete enforcement fields are required', () => {
  const a = canonicalPolicy(uid); delete a.domains.location
  const b = canonicalPolicy(uid); delete b.enforcement.providerState
  assert.equal(isCanonicalStoredPolicy(a, uid), false)
  assert.equal(isCanonicalStoredPolicy(b, uid), false)
})
test('memory mode is canonical even when it is denied, but not an authorization grant', () => {
  assert.equal(isCanonicalStoredPolicy(canonicalPolicy(uid, {mode:'denied'}), uid), true)
})
test('malformed policy and wrong owners fail closed', () => {
  const a = canonicalPolicy(uid); a.domains.memory.retentionDays = 1
  const b = canonicalPolicy(uid); b.addedField = true
  assert.equal(isCanonicalStoredPolicy(a, uid), false)
  assert.equal(isCanonicalStoredPolicy(b, uid), false)
  assert.equal(isCanonicalStoredPolicy(canonicalPolicy(uid), 'otherOwner'), false)
})
