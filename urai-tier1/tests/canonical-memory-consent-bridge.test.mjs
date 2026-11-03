import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const source = fs.readFileSync(path.join(root, 'src/lib/privacy/canonicalMemoryConsentClient.ts'), 'utf8')
const client = fs.readFileSync(path.join(root, 'src/app/privacy-controls/ConsentSanctuaryClient.tsx'), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'canonicalMemoryConsentClient.ts',
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
assert.equal(compiled.diagnostics.length, 0)
const receiptHash = 'a'.repeat(64)
const uid = 'owner-a'
const granted = (value = {}) => ({
  uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0',
  status: 'granted', receiptHash,
  expiresAt: new Date(Date.now() + 100000).toISOString(), ...value,
})
const revoked = (value = {}) => ({ ...granted(), status: 'revoked', expiresAt: null, ...value })
const snap = (data, metadata = { fromCache: false, hasPendingWrites: false }) => ({
  exists: () => data !== null, data: () => data, metadata,
})
function fixture({ currentUser = uid, remote = granted(), callableResult = null, failCallable = false } = {}) {
  const auth = { currentUser: currentUser ? { uid: currentUser } : null }
  const callbacks = []
  let requests = 0, serverReads = 0, unsubscribed = 0
  const result = callableResult ?? { consentId: `${uid}_memory_storage`, status: 'granted', consentTier: 'C1',
    policyVersion: '1.0.0', receiptHash }
  const mocks = {
    'firebase/auth': { getAuth: () => auth },
    'firebase/firestore': {
      doc: (db, ...segments) => ({ db, segments }),
      getDocFromServer: async ref => { serverReads++; assert.deepEqual([...ref.segments], ['consentRecords', `${uid}_memory_storage`]); return snap(remote) },
      onSnapshot: (ref, options, success, failure) => {
        assert.equal(options.includeMetadataChanges, true)
        assert.deepEqual([...ref.segments], ['consentRecords', `${uid}_memory_storage`])
        callbacks.push({ success, failure })
        return () => { unsubscribed++ }
      },
    },
    '@/lib/firebase/client': { app: { name: 'synthetic' }, firebasePublicEnvReady: true, getFirebaseDb: () => 'synthetic-db' },
    './operationalPrivacyClient': {
      callOperationalPrivacyFunction: async (name, payload) => {
        requests++
        assert.equal(name, 'setCanonicalConsent')
        assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
          purpose: 'memory.storage', status: result.status, surface: 'urai-consent-sanctuary',
        })
        if (failCallable) throw new Error('functions/not-found')
        return result
      },
    },
  }
  const exports = {}
  vm.runInNewContext(compiled.outputText, { exports, require: key => {
    assert.ok(key in mocks, `unexpected dependency ${key}`)
    return mocks[key]
  }, Date, Error, Number, Object, RegExp, String })
  return { api: exports, auth, callbacks, counters: () => ({ requests, serverReads, unsubscribed }) }
}

test('canonical record parser refuses wrong owners, purposes, tiers, hashes and versions', () => {
  const { api } = fixture()
  for (const value of [null, {}, granted({ uid: 'other' }), granted({ purpose: 'data.export' }),
    granted({ consentTier: 'C7' }), granted({ policyVersion: '0.1.0' }),
    granted({ receiptHash: 'bad' }), granted({ status: 'pending' }),
    granted({ expiresAt: null }), granted({ expiresAt: 'tomorrow' })]) {
    assert.equal(api.parseCanonicalMemoryConsent(value, uid).status, 'unavailable')
  }
  assert.equal(api.parseCanonicalMemoryConsent(granted(), uid).status, 'granted')
  assert.equal(api.parseCanonicalMemoryConsent(granted({ expiresAt: new Date(Date.now() - 2000).toISOString() }), uid).status, 'expired')
  assert.equal(api.parseCanonicalMemoryConsent(revoked(), uid).status, 'revoked')
})

test('a callable grant is only accepted after matching owner-scoped live server readback', async () => {
  const h = fixture()
  const result = await h.api.requestCanonicalMemoryConsent(uid, 'granted')
  assert.equal(result.status, 'granted')
  assert.equal(result.receiptHash, receiptHash)
  assert.deepEqual(h.counters(), { requests: 1, serverReads: 1, unsubscribed: 0 })
})

test('a revoked C1 receipt is independently confirmed, without claiming memory policy changed', async () => {
  const h = fixture({ remote: revoked(), callableResult: { consentId: `${uid}_memory_storage`, status: 'revoked', consentTier: 'C1', policyVersion: '1.0.0', receiptHash } })
  assert.equal((await h.api.requestCanonicalMemoryConsent(uid, 'revoked')).status, 'revoked')
})

test('missing callable, mismatched receipts or a stale server record fail closed', async () => {
  const h1 = fixture({ failCallable: true })
  await assert.rejects(h1.api.requestCanonicalMemoryConsent(uid, 'granted'))
  assert.equal(h1.counters().serverReads, 0)
  const h2 = fixture({ remote: granted({ receiptHash: 'b'.repeat(64) }) })
  await assert.rejects(h2.api.requestCanonicalMemoryConsent(uid, 'granted'), /NOT_CONFIRMED/)
  const h3 = fixture({ remote: null })
  await assert.rejects(h3.api.requestCanonicalMemoryConsent(uid, 'granted'), /NOT_CONFIRMED/)
})

test('signed-out, cross-user and changed-owner actions never claim canonical consent', async () => {
  const h = fixture({ currentUser: null })
  await assert.rejects(h.api.requestCanonicalMemoryConsent(uid, 'granted'), /AUTH_REQUIRED/)
  assert.equal(h.counters().requests, 0)
  const foreign = fixture({ currentUser: 'another-owner' })
  await assert.rejects(foreign.api.requestCanonicalMemoryConsent(uid, 'granted'), /AUTH_REQUIRED/)
})

test('cache and pending-write listener snapshots never grant owner C1 authority', () => {
  const h = fixture(); const states=[]
  const stop = h.api.watchCanonicalMemoryConsent(uid, state => states.push(state.status))
  const listener = h.callbacks[0]
  listener.success(snap(granted(), { fromCache: true, hasPendingWrites: false }))
  listener.success(snap(granted(), { fromCache: false, hasPendingWrites: true }))
  listener.success(snap(granted()))
  listener.success(snap(revoked()))
  assert.deepEqual(states, ['unavailable', 'unavailable', 'granted', 'revoked'])
  stop()
  listener.success(snap(granted()))
  assert.equal(states.length, 4)
  assert.equal(h.counters().unsubscribed, 1)
})

test('terminal listener errors fence queued stale grant callbacks', () => {
  const h = fixture(); const states=[]
  h.api.watchCanonicalMemoryConsent(uid, state => states.push(state.status))
  const listener = h.callbacks[0]
  listener.success(snap(granted()))
  listener.failure(new Error('terminal synthetic provider failure'))
  listener.success(snap(granted()))
  assert.deepEqual(states, ['granted', 'unavailable'])
})

test('Consent Sanctuary requires explicit confirmation, does not auto-grant, and distinguishes policy from C1', () => {
  assert.match(client, /setC1Confirmation\('granted'\)/)
  assert.match(client, /setC1Confirmation\('revoked'\)/)
  assert.match(client, /onClick=\{\(\) => void confirmCanonicalC1\(\)\}/)
  assert.match(client, /const status = c1Confirmation/)
  assert.match(client, /requestCanonicalMemoryConsent\(owner, status\)/)
  assert.match(client, /watchCanonicalMemoryConsent\(owner/)
  assert.match(client, /This explicit authorization is separate from the Spatial memory policy/)
  assert.doesNotMatch(client, /useEffect\([^)]*requestCanonicalMemoryConsent/)
})
