import assert from 'node:assert/strict'
import test from 'node:test'
import { lifeMapIdentitySearch } from '../src/components/lifemap/lifeMapIdentity.ts'

test('selection has a manifest on direct Home handoff before the asynchronous route commit', () => {
  const identity = lifeMapIdentitySearch(new URLSearchParams('demo=1&from=home-sky'))
  assert.equal(identity.get('manifestId'), 'replay-recovery-thread')
  assert.equal(identity.get('demo'), '1')
})

test('explicit manifest identity survives selection without forwarding unrelated private parameters', () => {
  const identity = lifeMapIdentitySearch(new URLSearchParams('manifestId=private:memory_2&token=secret&demo=0&memoryId=old'))
  assert.deepEqual([...identity], [['manifestId', 'private:memory_2']])
  assert.equal(lifeMapIdentitySearch(new URLSearchParams('manifestId=a%2Fb')).get('manifestId'), 'ab')
})
