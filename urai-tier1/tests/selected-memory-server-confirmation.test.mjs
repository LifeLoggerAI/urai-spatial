import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the real selected-memory hook with synthetic Firebase listeners.
const code = fs.readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function fixture({ failPolicySubscribe = false, failMemorySubscribe = false, failC1Subscribe = false, seedC1 = true } = {}) {
  const state = [], effects = [], listeners = []
  let cursor = 0, auth, dirty
  const react = {
    useMemo: fn => fn(),
    useState(value) {
      const index = cursor++
      if (!(index in state)) state[index] = value
      return [state[index], next => { state[index] = next; dirty = true }]
    },
    useEffect: fn => { effects.push(fn) },
  }
  const contract = {
    isExplicitDemoRequest: () => false,
    sanitizeMemoryId: value => value,
    parseSelectedMemory: (data, uid, id) => ({ status: 'ready', memory: { ...data, ownerId: uid, id } }),
  }
  const imports = {
    react,
    'firebase/firestore': {
      doc: (...parts) => parts,
      onSnapshot(ref, options, receive, error) {
        assert.equal(options.includeMetadataChanges, true, 'metadata-only server confirmation is mandatory')
        const listener = { ref, receive, error, stopped: false }
        listeners.push(listener)
        if ((ref.includes('privacyPolicy') && failPolicySubscribe) ||
            (ref.includes('memories') && failMemorySubscribe) ||
            (ref.includes('consentRecords') && failC1Subscribe)) {
          throw new Error('synthetic subscriber initialization failure')
        }
        return () => { listener.stopped = true }
      },
    },
    'firebase/auth': { getAuth: () => ({}), onAuthStateChanged(_auth, fn) { auth = fn; return () => {} } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => ({}) },
    '@/hooks/useBrowserLocation': { useBrowserLocation: () => '/focus?memoryId=synthetic' },
    '@/app/privacy-controls/consentModel': { isConsentPolicy: (row, uid) => row?.ownerId === uid },
    './explicitDemoMemory': { buildNamedExplicitDemoMemory: () => { throw Error('demo not allowed') } },
    './selectedMemoryContract': contract,
  }
  const exports = {}, module = { exports }
  vm.runInNewContext(js, { module, exports, require(name) {
    assert.ok(Object.prototype.hasOwnProperty.call(imports, name), 'unexpected dependency: ' + name)
    return imports[name]
  }, URLSearchParams, process: { env: {} } })
  cursor = 0
  module.exports.useSelectedMemory()
  const cleanup = effects.shift()()
  auth({ uid: 'synthetic-owner' })
  const snapshot = (value, fromCache, pending = false) => ({
    exists: () => value !== null, data: () => value,
    metadata: { fromCache, hasPendingWrites: pending },
  })
  const grant = { uid: 'synthetic-owner', purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted', receiptHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 3600000).toISOString() }
  if (seedC1) {
    const c1 = listeners.find(x => x.ref.includes('consentRecords'))
    assert.ok(c1)
    c1.receive(snapshot(grant, false))
  }
  const policy = { ownerId: 'synthetic-owner', revision: 1, domains: { memory: { mode: 'granted', lifeMapVisible: true, replayVisible: true } }, enforcement: { state: 'fully-enforced' } }
  const send = (name, value, fromCache = false, pending = false) => {
    const match = listeners.filter(x => x.ref.includes(name)).at(-1)
    assert.ok(match, 'missing ' + name + ' listener')
    match.receive(snapshot(value, fromCache, pending))
    cursor = 0; dirty = false
    return module.exports.useSelectedMemory()
  }
  return { listeners, policy, grant, send, cleanup, status: () => { cursor = 0; return module.exports.useSelectedMemory() } }
}

test('cache-only and locally pending consent grants never start private memory listeners', () => {
  const h = fixture()
  try {
    assert.equal(h.send('privacyPolicy', h.policy, true).status, 'unavailable')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
    assert.equal(h.send('privacyPolicy', h.policy, false, true).status, 'unavailable')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
    assert.equal(h.send('privacyPolicy', h.policy).status, 'loading')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
  } finally { h.cleanup() }
})

test('cached private memory never renders and server confirmation opens it', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    assert.equal(h.send('memories', { title: 'cached private text' }, true).memory, null)
    assert.equal(h.send('memories', { title: 'pending private text' }, false, true).memory, null)
    const live = h.send('memories', { title: 'verified source' })
    assert.equal(live.status, 'ready')
    assert.equal(live.memory.title, 'verified source')
  } finally { h.cleanup() }
})

test('a cached policy after a live grant immediately clears the private view', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    h.send('memories', { title: 'verified source' })
    const result = h.send('privacyPolicy', h.policy, true)
    assert.equal(result.memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories'))[0].stopped, true)
  } finally { h.cleanup() }
})

test('a policy snapshot with missing metadata never grants private read authority', () => {
  const h = fixture()
  try {
    const listener = h.listeners.find(x => x.ref.includes('privacyPolicy'))
    assert.ok(listener)
    listener.receive({ exists: () => true, data: () => h.policy })
    assert.equal(h.status().status, 'unavailable')
    assert.equal(h.status().memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
  } finally { h.cleanup() }
})

test('a private memory snapshot with missing metadata never becomes visible', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    const listener = h.listeners.find(x => x.ref.includes('memories'))
    assert.ok(listener)
    listener.receive({ exists: () => true, data: () => ({ title: 'unverified source' }) })
    assert.equal(h.status().status, 'unavailable')
    assert.equal(h.status().memory, null)
    const confirmed = h.send('memories', { title: 'verified source' })
    assert.equal(confirmed.status, 'ready')
    assert.equal(confirmed.memory.title, 'verified source')
  } finally { h.cleanup() }
})

test('pending source writes immediately hide previously verified private memory', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    assert.equal(h.send('memories', { title: 'verified original' }).status, 'ready')
    const pending = h.send('memories', { title: 'optimistic local rewrite' }, false, true)
    assert.equal(pending.status, 'unavailable')
    assert.equal(pending.memory, null)
    const confirmed = h.send('memories', { title: 'new server committed source' })
    assert.equal(confirmed.status, 'ready')
    assert.equal(confirmed.memory.title, 'new server committed source')
  } finally { h.cleanup() }
})

test('revocation and stale grants cannot restore a private listener at the same policy revision', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    h.send('memories', { title: 'verified original' })
    const revoked = { ...h.policy, revision: 2, domains: { memory: { ...h.policy.domains.memory, mode: 'denied' } } }
    const denied = h.send('privacyPolicy', revoked)
    assert.equal(denied.status, 'unauthorized')
    assert.equal(denied.memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories'))[0].stopped, true)
    assert.equal(h.send('privacyPolicy', h.policy, true).status, 'unavailable')
    assert.equal(h.send('privacyPolicy', h.policy).status, 'unavailable')
    assert.equal(h.send('privacyPolicy', { ...h.policy, revision: 2 }).status, 'unauthorized')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
    const allowed = h.send('privacyPolicy', { ...h.policy, revision: 3 })
    assert.equal(allowed.status, 'loading')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 2)
    assert.equal(h.send('memories', { title: 'new authoritative snapshot' }).status, 'ready')
  } finally { h.cleanup() }
})

test('metadata-only confirmed policy acknowledgements do not duplicate private listeners', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
    h.send('privacyPolicy', h.policy)
    h.send('privacyPolicy', h.policy)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
  } finally { h.cleanup() }
})

test('terminal private-memory listener failure invalidates stale callbacks until a fresh server-confirmed subscription', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    assert.equal(h.send('memories', { title: 'verified source' }).status, 'ready')
    const old = h.listeners.find(x => x.ref.includes('memories'))
    assert.ok(old)
    old.error(new Error('synthetic provider detail not for display'))
    assert.equal(h.status().status, 'unavailable')
    assert.equal(h.status().memory, null)
    assert.equal(old.stopped, true)
    old.receive({ exists: () => true, data: () => ({ title: 'stale private source' }),
      metadata: { fromCache: false, hasPendingWrites: false } })
    assert.equal(h.status().memory, null)
    assert.equal(h.send('privacyPolicy', h.policy).status, 'unavailable')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 2)
    assert.equal(h.send('memories', { title: 'new verified source' }).memory.title, 'new verified source')
  } finally { h.cleanup() }
})

test('terminal policy listener error never re-admits a stale grant callback', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    h.send('memories', { title: 'verified source' })
    const oldPolicy = h.listeners.find(x => x.ref.includes('privacyPolicy'))
    const oldMemory = h.listeners.find(x => x.ref.includes('memories'))
    oldPolicy.error(new Error('synthetic private consent provider detail'))
    assert.equal(h.status().status, 'unavailable')
    assert.equal(h.status().memory, null)
    assert.equal(oldMemory.stopped, true)
    oldPolicy.receive({ exists: () => true, data: () => h.policy,
      metadata: { fromCache: false, hasPendingWrites: false } })
    assert.equal(h.status().memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
  } finally { h.cleanup() }
})


test('synchronously failed policy subscription cannot admit a late queued consent grant', () => {
  const h = fixture({ failPolicySubscribe: true })
  try {
    assert.equal(h.status().status, 'unavailable')
    assert.equal(h.status().memory, null)
    const policy = h.listeners.find(x => x.ref.includes('privacyPolicy'))
    assert.ok(policy)
    policy.receive({ exists: () => true, data: () => h.policy,
      metadata: { fromCache: false, hasPendingWrites: false } })
    assert.equal(h.status().memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
  } finally { h.cleanup() }
})

test('synchronously failed memory subscription cannot display a late queued private source', () => {
  const h = fixture({ failMemorySubscribe: true })
  try {
    assert.equal(h.send('privacyPolicy', h.policy).status, 'unavailable')
    const old = h.listeners.find(x => x.ref.includes('memories'))
    assert.ok(old)
    old.receive({ exists: () => true, data: () => ({ title: 'stale private memory' }),
      metadata: { fromCache: false, hasPendingWrites: false } })
    assert.equal(h.status().memory, null)
  } finally { h.cleanup() }
})

test('C1 must be separately confirmed before a granted policy starts private memory', () => {
  const h = fixture({ seedC1: false })
  try {
    assert.equal(h.send('privacyPolicy', h.policy).status, 'loading')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
    assert.equal(h.send('consentRecords', h.grant, true).status, 'unavailable')
    assert.equal(h.send('consentRecords', h.grant, false, true).status, 'unavailable')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
    assert.equal(h.send('consentRecords', h.grant).status, 'loading')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
    assert.equal(h.send('memories', { title: 'authorized private source' }).status, 'ready')
  } finally { h.cleanup() }
})

test('C1 withdrawal clears an already visible memory and fences queued private source callbacks', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    h.send('memories', { title: 'private original' })
    const old = h.listeners.find(x => x.ref.includes('memories'))
    assert.equal(h.send('consentRecords', { ...h.grant, status: 'revoked' }).status, 'unauthorized')
    assert.equal(h.status().memory, null)
    assert.equal(old.stopped, true)
    old.receive({ exists: () => true, data: () => ({ title: 'late private callback' }),
      metadata: { fromCache: false, hasPendingWrites: false } })
    assert.equal(h.status().memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
    assert.equal(h.send('privacyPolicy', h.policy).status, 'unauthorized')
    assert.equal(h.send('consentRecords', { ...h.grant, receiptHash: 'b'.repeat(64) }).status, 'loading')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 2)
    assert.equal(h.send('memories', { title: 'newly authorized source' }).status, 'ready')
  } finally { h.cleanup() }
})

test('C1 cache downgrade immediately hides a previously server-confirmed private memory', () => {
  const h = fixture()
  try {
    h.send('privacyPolicy', h.policy)
    assert.equal(h.send('memories', { title: 'private original' }).status, 'ready')
    const old = h.listeners.find(x => x.ref.includes('memories'))
    assert.equal(h.send('consentRecords', h.grant, true).status, 'unavailable')
    assert.equal(h.status().memory, null)
    assert.equal(old.stopped, true)
  } finally { h.cleanup() }
})

test('malformed, foreign, missing, and expired C1 records cannot grant private memory', () => {
  const bad = [
    null, { ...fixture().grant, uid: 'another-owner' },
    { ...fixture().grant, consentTier: 'C7' },
    { ...fixture().grant, purpose: 'data.export' },
    { ...fixture().grant, policyVersion: '0.9.0' },
    { ...fixture().grant, receiptHash: 'invalid' },
    { ...fixture().grant, expiresAt: new Date(Date.now() - 1000).toISOString() },
    { ...fixture().grant, expiresAt: 'not-a-time' },
  ]
  for (const grant of bad) {
    const h = fixture({ seedC1: false })
    try {
      h.send('privacyPolicy', h.policy)
      const result = h.send('consentRecords', grant)
      assert.equal(result.status, 'unauthorized')
      assert.equal(result.memory, null)
      assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
    } finally { h.cleanup() }
  }
})

test('limited memory policy cannot substitute for the protected backend granted mode', () => {
  const h = fixture()
  try {
    const limited = { ...h.policy, domains: { memory: { ...h.policy.domains.memory, mode: 'limited' } } }
    assert.equal(h.send('privacyPolicy', limited).status, 'unauthorized')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
    assert.equal(h.send('privacyPolicy', { ...h.policy, revision: 2 }).status, 'loading')
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 1)
  } finally { h.cleanup() }
})

test('failed C1 listener cannot reauthorize memory through a late success callback', () => {
  const h = fixture({ failC1Subscribe: true, seedC1: false })
  try {
    assert.equal(h.status().status, 'unavailable')
    h.send('privacyPolicy', h.policy)
    const late = h.listeners.find(x => x.ref.includes('consentRecords'))
    late.receive({ exists: () => true, data: () => h.grant,
      metadata: { fromCache: false, hasPendingWrites: false } })
    assert.equal(h.status().memory, null)
    assert.equal(h.listeners.filter(x => x.ref.includes('memories')).length, 0)
  } finally { h.cleanup() }
})
