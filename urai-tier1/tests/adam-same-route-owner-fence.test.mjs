import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/spatial/adam/AdamPresenceRuntime.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const beginning = source.indexOf('  useEffect(() => {\n    if (!firebasePublicEnvReady) return\n    let disposed = false')
const ending = source.indexOf('\n  }, [stopAll])', beginning)
assert.ok(beginning > 0 && ending > beginning, 'original Adam must own the Firebase session listener')
const body = source.slice(beginning + '  useEffect(() => {\n'.length, ending)
// The checked-in component is TypeScript; node:vm evaluates JavaScript.
// Erase only the verified local UID annotation. Never rewrite application code.
const typedUid = 'let lastUid: string | null | undefined'
assert.equal(body.split(typedUid).length, 2, 'expected original UID declaration')
const executableBody = body.replace(typedUid, 'let lastUid')

function fixture() {
  const events = []
  let owner, error, unsubscribeCount = 0
  let removed = false
  const state = { messages: ['PRIVATE_OWNER_A'], draft: 'PRIVATE_DRAFT_A', stream: 'PRIVATE_DELTA_A', aiConsent: true, voiceConsent: true }
  const setters = {
    setMessages: value => { state.messages = Array.from(value); events.push('messages') },
    setMessage: value => { state.draft = value; events.push('draft') },
    setStreamedText: value => { state.stream = value; events.push('stream') },
    setStreamedLocale: value => { state.locale = value },
    setAiConsent: value => { state.aiConsent = value },
    setVoiceConsent: value => { state.voiceConsent = value },
    setStatus: value => { state.status = value },
  }
  const context = {
    firebasePublicEnvReady: true,
    ...setters,
    stopAll: () => events.push('abort'),
    getUraiAuth: () => ({}),
    onAuthStateChanged: (_auth, next, fail) => {
      owner = next
      error = fail
      return () => { unsubscribeCount++; removed = true }
    },
  }
  const cleanup = vm.runInNewContext('(function(){' + executableBody + '\n})', context)()
  return {
    state, events, callback: nextUid => owner(nextUid === null ? null : { uid: nextUid }),
    fail: () => error(new Error('auth rejected')), cleanup,
    get unsubscribed() { return unsubscribeCount }, get removed() { return removed },
  }
}

test('same-route account switch aborts all old private context', () => {
  const f = fixture()
  f.callback('owner-a')
  assert.deepEqual(f.state.messages, ['PRIVATE_OWNER_A'])
  f.callback('owner-b')
  assert.equal(f.events[0], 'abort')
  assert.deepEqual(f.state.messages, [])
  assert.equal(f.state.draft, '')
  assert.equal(f.state.stream, '')
  assert.equal(f.state.aiConsent, false)
  assert.equal(f.state.voiceConsent, false)
})

test('same account token refresh preserves current conversation', () => {
  const f = fixture()
  f.callback('owner-a')
  f.callback('owner-a')
  assert.equal(f.events.length, 0)
  assert.deepEqual(f.state.messages, ['PRIVATE_OWNER_A'])
})

test('sign-out invalidates prior owner and clears all text', () => {
  const f = fixture()
  f.callback('owner-a')
  f.callback(null)
  assert.equal(f.events[0], 'abort')
  assert.deepEqual(f.state.messages, [])
  assert.equal(f.state.draft, '')
  assert.equal(f.state.stream, '')
})

test('restored signed-out account clears any stale draft', () => {
  const f = fixture()
  f.callback(null)
  assert.equal(f.events[0], 'abort')
  assert.deepEqual(f.state.messages, [])
})

test('auth subscription error clears private data', () => {
  const f = fixture()
  f.callback('owner-a')
  f.fail()
  assert.equal(f.events[0], 'abort')
  assert.deepEqual(f.state.messages, [])
})

test('late Firebase callbacks after unmount cannot write private state', () => {
  const f = fixture()
  f.callback('owner-a')
  f.cleanup()
  f.callback('owner-b')
  f.fail()
  assert.equal(f.unsubscribed, 1)
  assert.equal(f.removed, true)
  assert.deepEqual(f.events, [])
  assert.deepEqual(f.state.messages, ['PRIVATE_OWNER_A'])
})
