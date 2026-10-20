import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createPrivateMovieReconnectPolicy } from '../src/app/replay/privateMovieReconnectPolicy.ts'

test('uninterrupted online private session never retries', () => {
  let attempts = 0
  const policy = createPrivateMovieReconnectPolicy(() => attempts++, () => true)
  policy.observeOnline()
  policy.observeOnline()
  assert.equal(attempts, 0)
})
test('a network outage only reauthorizes after reconnect, exactly once per outage', () => {
  let online = true, attempts = 0
  const policy = createPrivateMovieReconnectPolicy(() => attempts++, () => online)
  online = false
  policy.observeOffline()
  policy.observeOnline()
  assert.equal(attempts, 0)
  online = true
  policy.observeOnline()
  policy.observeOnline()
  assert.equal(attempts, 1)
  online = false
  policy.observeOffline()
  online = true
  policy.observeOnline()
  assert.equal(attempts, 2)
})
test('mounting offline requires reauthorization once connectivity returns', () => {
  let online = false, attempts = 0
  const policy = createPrivateMovieReconnectPolicy(() => attempts++, () => online)
  policy.observeOnline()
  assert.equal(attempts, 0)
  online = true
  policy.observeOnline()
  assert.equal(attempts, 1)
})
test('dispose blocks late network callbacks after logout or selection change', () => {
  let online = true, attempts = 0
  const policy = createPrivateMovieReconnectPolicy(() => attempts++, () => online)
  online = false
  policy.observeOffline()
  policy.dispose()
  online = true
  policy.observeOnline()
  policy.observeOffline()
  policy.observeOnline()
  assert.equal(attempts, 0)
})
test('original protected Replay clears prior Blob and session before reconnect', () => {
  const hook = fs.readFileSync(new URL('../src/app/replay/useProtectedLifeMovieReplay.ts', import.meta.url), 'utf8')
  assert.match(hook, /createPrivateMovieReconnectPolicy\(/)
  assert.match(hook, /window\.addEventListener\('offline',offline\)/)
  assert.match(hook, /window\.addEventListener\('online',online\)/)
  assert.match(hook, /reconnect\.dispose\(\)/)
  assert.match(hook, /revoke\?\.\(\)/)
  assert.match(hook, /URL\.revokeObjectURL/)
  assert.match(hook, /reconnectEpoch\]/)
  assert.match(hook, /spatialUser\.getIdToken\(true\)/)
  assert.match(hook, /studioUser\.getIdToken\(true\)/)
})
