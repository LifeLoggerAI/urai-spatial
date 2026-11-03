import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/lib/privacy/canonicalMemoryConsentClient.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'canonicalMemoryConsentClient.ts',
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
assert.equal(compiled.diagnostics.length, 0)

function fixture() {
  const uid = 'test-owner'
  const auth = { currentUser: { uid } }
  const callbacks = []
  const timers = new Map()
  const counters = { stopped: 0 }
  let now = 1700000000000, nextId = 0
  class MockDate extends Date { static now() { return now } }
  const setTimeoutMock = (fn, delay) => {
    assert.ok(delay >= 0 && delay <= 2147483647, 'timer delay must not overflow')
    const id = ++nextId
    timers.set(id, { fn, at: now + delay })
    return id
  }
  const mocks = {
    'firebase/auth': { getAuth: () => auth },
    'firebase/firestore': {
      doc: (_db, ...segments) => ({ segments }),
      getDocFromServer: async () => { throw Error('not used') },
      onSnapshot: (_ref, options, success, failure) => {
        assert.equal(options.includeMetadataChanges, true)
        callbacks.push({ success, failure })
        return () => { counters.stopped++ }
      },
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => 'db' },
    './operationalPrivacyClient': { callOperationalPrivacyFunction: async () => { throw Error('not used') } },
  }
  const exports = {}
  vm.runInNewContext(compiled.outputText, {
    exports, require: name => {
      assert.ok(name in mocks, 'unexpected imported module: ' + name)
      return mocks[name]
    },
    Date: MockDate, Error, Number, Object, RegExp, String,
    setTimeout: setTimeoutMock,
    clearTimeout: id => timers.delete(id),
  })
  const record = (status = 'granted', duration = 100) => ({
    uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status,
    receiptHash: 'a'.repeat(64),
    expiresAt: status === 'granted' ? new Date(now + duration).toISOString() : null,
  })
  const snap = (data, metadata = { fromCache: false, hasPendingWrites: false }) =>
    ({ exists: () => data !== null, data: () => data, metadata })
  const advance = ms => {
    now += ms
    let iterations = 0
    while (true) {
      const due = [...timers.entries()].filter(([, item]) => item.at <= now).sort((a, b) => a[1].at - b[1].at)[0]
      if (!due) return
      assert.ok(++iterations < 1000, 'unbounded expiry timer')
      timers.delete(due[0])
      due[1].fn()
    }
  }
  return { api: exports, auth, callbacks, timers, counters, record, snap, advance }
}

test('confirmed C1 grant expires without a Firestore change event', () => {
  const h = fixture(), states = []
  const stop = h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
  h.callbacks[0].success(h.snap(h.record()))
  assert.deepEqual(states, ['granted'])
  assert.equal(h.timers.size, 1)
  h.advance(99)
  assert.deepEqual(states, ['granted'])
  h.advance(1)
  assert.deepEqual(states, ['granted', 'expired'])
  stop()
})

test('revocation cancels a pending grant expiry', () => {
  const h = fixture(), states = []
  h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
  h.callbacks[0].success(h.snap(h.record()))
  h.callbacks[0].success(h.snap(h.record('revoked')))
  assert.equal(h.timers.size, 0)
  h.advance(1000)
  assert.deepEqual(states, ['granted', 'revoked'])
})

test('cache and pending writes immediately fail closed', () => {
  for (const metadata of [
    { fromCache: true, hasPendingWrites: false },
    { fromCache: false, hasPendingWrites: true },
  ]) {
    const h = fixture(), states = []
    h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
    h.callbacks[0].success(h.snap(h.record()))
    h.callbacks[0].success(h.snap(h.record(), metadata))
    assert.deepEqual(states, ['granted', 'unavailable'])
    assert.equal(h.timers.size, 0)
  }
})

test('unsubscription cancels expiry and ignores late snapshots', () => {
  const h = fixture(), states = []
  const stop = h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
  h.callbacks[0].success(h.snap(h.record()))
  stop()
  assert.equal(h.timers.size, 0)
  assert.equal(h.counters.stopped, 1)
  h.advance(1000)
  h.callbacks[0].success(h.snap(h.record()))
  assert.deepEqual(states, ['granted'])
})

test('listener failure cancels expiry and rejects a stale grant', () => {
  const h = fixture(), states = []
  h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
  h.callbacks[0].success(h.snap(h.record()))
  h.callbacks[0].failure(Error('simulated listener failure'))
  assert.equal(h.timers.size, 0)
  h.advance(1000)
  h.callbacks[0].success(h.snap(h.record()))
  assert.deepEqual(states, ['granted', 'unavailable'])
})

test('new server grant replaces an old expiry deadline', () => {
  const h = fixture(), states = []
  h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
  h.callbacks[0].success(h.snap(h.record()))
  h.advance(50)
  h.callbacks[0].success(h.snap(h.record('granted', 200)))
  assert.equal(h.timers.size, 1)
  h.advance(50)
  assert.equal(states.at(-1), 'granted')
  h.advance(150)
  assert.equal(states.at(-1), 'expired')
})

test('long deadlines use bounded timers without overflow', () => {
  const h = fixture(), states = []
  h.api.watchCanonicalMemoryConsent('test-owner', s => states.push(s.status))
  h.callbacks[0].success(h.snap(h.record('granted', 30 * 24 * 60 * 60 * 1000)))
  assert.equal([...h.timers.values()][0].at - 1700000000000, 2147483647)
  h.advance(2147483647)
  assert.equal(states.at(-1), 'granted')
  assert.equal(h.timers.size, 1)
  h.advance(30 * 24 * 60 * 60 * 1000 - 2147483647)
  assert.equal(states.at(-1), 'expired')
})
