import assert from 'node:assert/strict'
import test from 'node:test'
import { ownerSessionMatches } from '../src/lib/privacy/ownerSessionFence.ts'

const source = {
  initiatingUid: 'owner-a', currentUid: 'owner-a',
  initiatingEpoch: 4, currentEpoch: 4, online: true,
}
test('owner-session fence allows only the same authenticated online owner and epoch', () => {
  assert.equal(ownerSessionMatches(source), true)
})
test('owner-session fence denies cross-owner, signout, disconnection and stale callbacks', () => {
  const cases = [
    { currentUid: 'owner-b' }, { currentUid: '' }, { currentUid: null },
    { currentUid: undefined }, { initiatingUid: null }, { initiatingUid: '' },
    { initiatingUid: 'owner-b' }, { online: false }, { online: undefined },
    { initiatingEpoch: 3 }, { currentEpoch: 5 },
    { initiatingEpoch: -1 }, { currentEpoch: -1 },
    { initiatingEpoch: NaN }, { currentEpoch: Infinity },
    { initiatingEpoch: 2.3 }, { currentEpoch: Number.MAX_SAFE_INTEGER + 1 },
  ]
  for(const change of cases) {
    assert.equal(ownerSessionMatches({ ...source, ...change }), false, JSON.stringify(change))
  }
})
test('an epoch change prevents account A re-login callbacks from reviving account A data', () => {
  assert.equal(ownerSessionMatches({ ...source, currentEpoch: 5 }), false)
  assert.equal(ownerSessionMatches({ ...source, initiatingEpoch: 5, currentEpoch: 5 }), true)
})
