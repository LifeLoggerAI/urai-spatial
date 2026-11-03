import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the real selected-memory hook with synthetic Firebase listeners.
const code = fs.readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function fixture() {
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
  const policy = { ownerId: 'synthetic-owner', revision: 1, domains: { memory: { mode: 'granted', lifeMapVisible: true, replayVisible: true } }, enforcement: { state: 'fully-enforced' } }
  const send = (name, value, fromCache = false, pending = false) => {
    const match = listeners.filter(x => x.ref.includes(name)).at(-1)
    assert.ok(match, 'missing ' + name + ' listener')
    match.receive(snapshot(value, fromCache, pending))
    cursor = 0; dirty = false
    return module.exports.useSelectedMemory()
  }
  return { listeners, policy, send, cleanup, status: () => { cursor = 0; return module.exports.useSelectedMemory() } }
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
