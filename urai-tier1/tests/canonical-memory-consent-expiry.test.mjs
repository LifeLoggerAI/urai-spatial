import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const source = fs.readFileSync(path.join(root, 'src/lib/privacy/canonicalMemoryConsentClient.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'canonicalMemoryConsentClient.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
assert.equal(compiled.diagnostics.length, 0, 'source must transpile')
const uid = 'canonical-consent-owner-a'
const receiptA = 'a'.repeat(64)
const receiptB = 'b'.repeat(64)
function harness() {
  let now = Date.parse('2026-11-02T00:00:00.000Z')
  let nextTimer = 0
  const timers = new Map()
  const auth = { currentUser: { uid } }
  const listeners = []
  class ClockDate extends Date { static now() { return now } }
  const setFakeTimeout = (fn, ms) => {
    const id = ++nextTimer
    timers.set(id, { at: now + ms, fn, ms })
    return id
  }
  const clearFakeTimeout = (id) => { timers.delete(id) }
  const modules = {
    'firebase/auth': { getAuth: () => auth },
    'firebase/firestore': {
      doc: (db, ...segments) => ({ db, segments }),
      getDocFromServer: async () => { throw new Error('server reads not used in watch test') },
      onSnapshot: (ref, options, success, failure) => {
        assert.deepEqual([...ref.segments], ['consentRecords', `${uid}_memory_storage`])
        assert.equal(options.includeMetadataChanges, true)
        listeners.push({ success, failure })
        return () => { }
      },
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => 'test-db' },
    './operationalPrivacyClient': { callOperationalPrivacyFunction: async () => { throw new Error('not used') } },
  }
  const exports = {}
  vm.runInNewContext(compiled.outputText, {
    exports, require: name => {
      assert.ok(name in modules, `unexpected dependency ${name}`)
      return modules[name]
    },
    Date: ClockDate, setTimeout: setFakeTimeout, clearTimeout: clearFakeTimeout,
    Error, Number, Object, RegExp, String,
  })
  const snap = (record, metadata = { fromCache: false, hasPendingWrites: false }) => ({
    exists: () => record !== null,
    data: () => record,
    metadata,
  })
  const record = (expiresInMs, overrides = {}) => ({
    uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0',
    status: 'granted', receiptHash: receiptA,
    expiresAt: new Date(now + expiresInMs).toISOString(), ...overrides,
  })
  const advance = (ms) => {
    const until = now + ms
    let count = 0
    while (true) {
      const ready = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0]
      if (!ready) break
      if (++count > 100) throw new Error('timer runaway')
      now = ready[1].at
      timers.delete(ready[0])
      ready[1].fn()
    }
    now = until
  }
  return { api: exports, listeners, snap, record, advance, timers, auth }
}

test('C1 grant expires without relying on a second Firestore snapshot', () => {
  const h = harness()
  const states = []
  const stop = h.api.watchCanonicalMemoryConsent(uid, value => states.push(value.status))
  h.listeners[0].success(h.snap(h.record(10_000)))
  assert.deepEqual(states, ['granted'])
  h.advance(10_001)
  assert.deepEqual(states, ['granted', 'expired'])
  stop()
})

test('revoke or deny cancels pending C1 expiry and never emits a second misleading status', () => {
  for (const status of ['revoked', 'denied']) {
    const h = harness()
    const states = []
    const stop = h.api.watchCanonicalMemoryConsent(uid, value => states.push(value.status))
    h.listeners[0].success(h.snap(h.record(5000)))
    h.listeners[0].success(h.snap(h.record(0, { status, expiresAt: null })))
    h.advance(10_000)
    assert.deepEqual(states, ['granted', status])
    assert.equal(h.timers.size, 0)
    stop()
  }
})

test('a renewed C1 receipt replaces rather than inherits the prior deadline', () => {
  const h = harness()
  const states = []
  const stop = h.api.watchCanonicalMemoryConsent(uid, value => states.push(value.status))
  h.listeners[0].success(h.snap(h.record(5_000)))
  h.advance(3_000)
  h.listeners[0].success(h.snap(h.record(15_000, { receiptHash: receiptB })))
  h.advance(2_002)
  assert.deepEqual(states, ['granted', 'granted'])
  h.advance(12_999)
  assert.deepEqual(states, ['granted', 'granted', 'expired'])
  stop()
})

test('offline cache and terminal listener errors retire the expiration timer', () => {
  for (const outcome of ['cache', 'error']) {
    const h = harness()
    const states = []
    h.api.watchCanonicalMemoryConsent(uid, value => states.push(value.status))
    h.listeners[0].success(h.snap(h.record(10_000)))
    if (outcome === 'cache') h.listeners[0].success(h.snap(h.record(10_000), { fromCache: true, hasPendingWrites: false }))
    else h.listeners[0].failure(new Error('synthetic terminal failure'))
    h.advance(30_000)
    assert.deepEqual(states, ['granted', 'unavailable'])
    assert.equal(h.timers.size, 0)
    if (outcome === 'error') h.listeners[0].success(h.snap(h.record(10_000)))
    assert.deepEqual(states, ['granted', 'unavailable'])
  }
})

test('unsubscription and signout cannot emit a late expired or granted state', () => {
  const h = harness()
  const states = []
  const stop = h.api.watchCanonicalMemoryConsent(uid, value => states.push(value.status))
  h.listeners[0].success(h.snap(h.record(5_000)))
  stop()
  h.advance(10_000)
  h.listeners[0].success(h.snap(h.record(10_000)))
  assert.deepEqual(states, ['granted'])
  assert.equal(h.timers.size, 0)
})

test('long-lived consent uses a bounded timer and cannot expire prematurely', () => {
  const h = harness()
  const states = []
  const stop = h.api.watchCanonicalMemoryConsent(uid, value => states.push(value.status))
  h.listeners[0].success(h.snap(h.record(2_147_483_647 + 10_000)))
  assert.ok([...h.timers.values()].every(x => x.ms <= 2_147_483_647))
  h.advance(2_147_483_647)
  assert.deepEqual(states, ['granted'])
  h.advance(10_001)
  assert.deepEqual(states, ['granted', 'expired'])
  stop()
})
