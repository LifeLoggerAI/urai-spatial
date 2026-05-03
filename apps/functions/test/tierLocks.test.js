const test = require('node:test')
const assert = require('node:assert/strict')

const { evaluateDecision } = require('../lib/tierLocks.js')

test('blocks unauthenticated tier2 feature', () => {
  const out = evaluateDecision({ featureId: 'spatial.lifeMap.personal', userTier: 'tier1', authenticated: false, isAdmin: false, isFounder: false, consents: {}, flags: { spatial_lifemap_personal: true } })
  assert.equal(out.allowed, false)
  assert.ok(out.reasons.includes('unauthenticated'))
})

test('allows founder override', () => {
  const out = evaluateDecision({ featureId: 'spatial.admin.inspectLocks', userTier: 'tier1', authenticated: false, isAdmin: false, isFounder: true, consents: {}, flags: { spatial_admin_inspect_locks: true } })
  assert.equal(out.allowed, true)
})
