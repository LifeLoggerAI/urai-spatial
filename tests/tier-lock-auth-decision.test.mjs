import test from 'node:test'
import assert from 'node:assert/strict'
import { canApplyTierDecision } from '../urai-tier1/src/lib/tier-locks/authDecisionScope.ts'

const allowed = (featureId = 'spatial.lifeMap.personal') => ({
  allowed: true, featureId, requiredTier: 'tier2', userTier: 'tier2', reasons: [], flags: {},
})
const scope = (uid, revision, featureId = 'spatial.lifeMap.personal', requiresAuth = true) => ({
  uid, revision, featureId, requiresAuth, userTier: 'tier2',
})

test('owner A allowed then signed out rejects the old enabled response', () => {
  const a = scope('owner-a', 1)
  assert.equal(canApplyTierDecision(a, a, allowed()), true)
  assert.equal(canApplyTierDecision(a, scope(null, 2), allowed()), false)
})

test('owner B same tier never inherits an in-flight owner A grant', () => {
  const a = scope('owner-a', 1)
  const b = scope('owner-b', 3)
  assert.equal(canApplyTierDecision(a, b, allowed()), false)
  assert.equal(canApplyTierDecision(b, b, allowed()), true)
})

test('same UID with refreshed ID token revokes an old result', () => {
  const old = scope('owner-a', 7)
  assert.equal(canApplyTierDecision(old, scope('owner-a', 8), allowed()), false)
})

test('feature and tier changes cannot reuse the previous decision', () => {
  const a = scope('owner-a', 1)
  assert.equal(canApplyTierDecision(a, { ...a, featureId: 'spatial.memoryStars.personal' }, allowed()), false)
  assert.equal(canApplyTierDecision(a, { ...a, userTier: 'tier3' }, allowed()), false)
})

test('anonymous premium cannot receive an allowed decision', () => {
  const anonymous = scope(null, 1)
  assert.equal(canApplyTierDecision(anonymous, anonymous, allowed()), false)
})

test('public features permit scoped, internally consistent anonymous decisions', () => {
  const anon = scope(null, 1, 'spatial.starfield.preview', false)
  assert.equal(canApplyTierDecision(anon, anon, allowed('spatial.starfield.preview')), true)
})

test('malformed or contradictory server responses fail closed', () => {
  const a = scope('owner-a', 1)
  for (const invalid of [null, {}, { ...allowed(), featureId: 'other' }, { ...allowed(), reasons: ['denied'] }, { ...allowed(), allowed: 'true' }, { ...allowed(), reasons: 'wrong' }, { ...allowed(), requiredTier: null }]) {
    assert.equal(canApplyTierDecision(a, a, invalid), false)
  }
})
