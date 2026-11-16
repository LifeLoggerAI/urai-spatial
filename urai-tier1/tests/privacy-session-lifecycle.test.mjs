import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

// Execute the actual subscription effects with controlled auth and delivery order.
// No Firebase/network calls or private account data are used by this regression.
const read = (name) => fs.readFileSync(`src/app/${name}`, 'utf8')
const passport = read('passport/PassportVaultClient.tsx')
const consent = read('privacy-controls/ConsentSanctuaryClient.tsx')
const effects = (source) => [...source.matchAll(/  useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[[^\n]*\]\)/g)].map((match) => match[1])
const effect = (source, marker) => {
  const matches = effects(source).filter((body) => body.includes(marker))
  assert.equal(matches.length, 1, `one effect owns ${marker}`)
  return matches[0]
}
const run = (body, env) => new Function(...Object.keys(env), body)(...Object.values(env))

for (const [name, source, stateKey] of [['Passport', passport, 'State'], ['Consent', consent, 'LoadState']]) {
  for (const mode of ['demo', 'signed-out', 'unavailable', 'private']) {
    test(`${name} reconnect restores ${mode} authority without a permanent loading state`, () => {
      const { env, state } = fixture()
      const listeners = {}
      env.explicitDemo = mode === 'demo'
      env.firebasePublicEnvReady = mode !== 'unavailable'
      env.user = mode === 'private' ? { uid: 'owner-a' } : null
      env.window = { addEventListener: (type, callback) => { listeners[type] = callback }, removeEventListener: type => { delete listeners[type] } }
      env.document = { createElement: () => ({ getContext: () => null }) }
      env.setWebglAvailable = () => {}
      env[`set${stateKey}`] = value => { state[stateKey] = typeof value === 'function' ? value(state[stateKey]) : value }
      const cleanup = run(effect(source, "window.addEventListener('online'"), env)
      listeners.offline()
      assert.equal(state[stateKey], 'offline')
      listeners.online()
      assert.equal(state[stateKey], mode === 'private' ? 'loading' : mode)
      cleanup()
      assert.deepEqual(listeners, {})
    })
  }
}
const unresolvedSource = consent.slice(consent.indexOf('function unresolvedPolicy()'), consent.indexOf('function demoPolicy()'))
const unresolvedPolicy = new Function(`${unresolvedSource.replaceAll(': ConsentPolicy', '').replaceAll(': ConsentDomainPolicy', '')}; return unresolvedPolicy`)()

function fixture() {
  const state = {}
  const env = {
    explicitDemo: false, firebasePublicEnvReady: true, app: {},
    user: { uid: 'owner-a' }, state: 'loading', loadState: 'loading',
    authEpoch: { current: 1 }, exportDownloads: { current: { stop: () => { state.transferStops = (state.transferStops ?? 0) + 1 } } }, exportAuthorityRevision: { current: null }, navigator: { onLine: true },
    getAuth: () => ({}), getFirebaseDb: () => ({}), doc: (...args) => args,
    unresolvedPolicy,
    list: (value) => Array.isArray(value) ? value : [],
    record: value => value && typeof value === 'object' ? value : {},
    isConsentPolicy: (value, uid) => value?.ownerId === uid && value?.version === 2,
    defaultConsentPolicy: () => { throw new Error('Client must not invent persisted consent') },
    onAuthStateChanged: (_auth, callback) => { env.authCallback = callback; return () => {} },
  }
  for (const name of ['User', 'Snapshot', 'Exports', 'Deletions', 'Receipts', 'Confirmation', 'Busy', 'State', 'Message', 'Policy', 'Pending', 'MutationState', 'DeletionConfirmation', 'OperationBusy', 'ShowAudit', 'LoadState', 'ExportDownloading']) {
    env[`set${name}`] = (value) => { state[name] = value }
  }
  return { env, state }
}

for (const [name, source] of [['Passport', passport], ['Consent', consent]]) {
  test(`${name} unmount invalidates pending export authority and stops its session`, () => {
    const { env, state } = fixture()
    const cleanupSource = source.match(/useEffect\(\(\) => \(\) => \{ ([^\n]+) \}, \[\]\)/)?.[1]
    assert.ok(cleanupSource, 'actual unmount effect must own pending-transfer cleanup')
    const prior = env.authEpoch.current
    run(cleanupSource, env)
    assert.equal(env.authEpoch.current, prior + 1)
    assert.equal(state.transferStops, 1)
  })
  test(`${name} clears private history and confirmation on sign-out and account switch`, () => {
    const { env, state } = fixture()
    run(effect(source, 'onAuthStateChanged'), env)
    for (const nextUser of [null, { uid: 'owner-b' }]) {
      Object.assign(state, { Snapshot: { owner: 'owner-a' }, Receipts: ['private'], Exports: ['private'], Deletions: ['private'], Confirmation: 'confirmed', DeletionConfirmation: 'confirmed', Pending: { domain: 'memory' } })
      const epoch = env.authEpoch.current
      env.authCallback(nextUser)
      assert.equal(env.authEpoch.current, epoch + 1)
      assert.equal(state.ExportDownloading, false)
      assert.ok(state.transferStops > 0)
      for (const key of ['Receipts', 'Exports', 'Deletions']) assert.deepEqual(state[key], [])
      if (name === 'Passport') {
        assert.deepEqual(state.Snapshot, {})
        assert.equal(state.Confirmation, '')
      } else {
        assert.equal(state.Policy.ownerId, 'unresolved')
        assert.ok(Object.values(state.Policy.domains).every((domain) => domain.mode === 'denied'))
        assert.equal(state.Pending, null)
        assert.equal(state.DeletionConfirmation, '')
      }
    }
  })

  test(`${name} ignores prior-owner collection events before cleanup and after cleanup`, () => {
    const { env, state } = fixture()
    const callbacks = []
    env.subscribeOperationalUserCollection = (_name, _uid, success, error) => {
      callbacks.push({ success, error }); return () => {}
    }
    const cleanup = run(effect(source, 'const unsubscribers'), env)
    callbacks[0].success([{ id: 'current-owner-record' }])
    assert.ok(Object.values(state).some((value) => Array.isArray(value) && value[0]?.id === 'current-owner-record'))
    env.authEpoch.current += 1
    const before = structuredClone(state)
    for (const callback of callbacks) { callback.success([{ id: 'stale-private-record' }]); callback.error() }
    assert.deepEqual(state, before)
    cleanup()
    for (const callback of callbacks) callback.success([{ id: 'after-unmount' }])
    assert.deepEqual(state, before)
  })
}

test('Passport ignores a prior-owner snapshot resolving before React effect cleanup', async () => {
  const { env, state } = fixture()
  let resolve
  env.getOperationalPassportSnapshot = () => new Promise((done) => { resolve = done })
  const cleanup = run(effect(passport, 'void getOperationalPassportSnapshot'), env)
  env.authEpoch.current += 1
  resolve({ owner: { ownerReference: 'prior-owner' }, sources: [] })
  await Promise.resolve()
  assert.equal(state.Snapshot, undefined)
  assert.equal(state.State, undefined)
  cleanup()
})

test('Passport ignores a snapshot that completes after the browser goes offline', async () => {
  const { env, state } = fixture()
  let resolve
  env.getOperationalPassportSnapshot = () => new Promise(done => { resolve = done })
  const cleanup = run(effect(passport, 'void getOperationalPassportSnapshot'), env)
  env.navigator.onLine = false
  resolve({ owner: { keyState: 'authorized' }, sources: [{ id: 'source' }] })
  await Promise.resolve()
  assert.equal(state.State, undefined)
  assert.equal(state.Snapshot, undefined)
  cleanup()
})

test('Consent cannot regain writable authority from an offline queued snapshot', () => {
  const { env, state } = fixture()
  let callback
  env.onSnapshot = (_ref, next) => { callback = next; return () => {} }
  const cleanup = run(effect(consent, 'const policyRef'), env)
  env.navigator.onLine = false
  callback({ exists: () => true, data: () => ({ ownerId: 'owner-a', version: 2, enforcement: { state: 'fully-enforced' } }) })
  assert.equal(state.LoadState, undefined)
  assert.equal(state.Policy, undefined)
  cleanup()
})

test('Consent never reports a missing or invalid server policy as enforced', () => {
  for (const snapshot of [{ exists: () => false, data: () => undefined }, { exists: () => true, data: () => ({ ownerId: 'wrong-owner', version: 2 }) }]) {
    const { env, state } = fixture()
    env.onSnapshot = (_ref, callback) => { callback(snapshot); return () => {} }
    run(effect(consent, 'const policyRef'), env)
    assert.equal(state.LoadState, 'unavailable')
    assert.equal(state.Policy.enforcement.state, 'pending')
    assert.equal(state.Policy.ownerId, 'unresolved')
    assert.equal(state.MutationState, 'failed')
  }
})

test('Consent ignores a queued prior-owner policy and fails closed on read errors', () => {
  const { env, state } = fixture()
  let success, error
  env.onSnapshot = (_ref, onSuccess, onError) => { success = onSuccess; error = onError; return () => {} }
  const cleanup = run(effect(consent, 'const policyRef'), env)
  error()
  assert.equal(state.Policy.ownerId, 'unresolved')
  assert.equal(state.LoadState, 'unavailable')
  env.authEpoch.current += 1
  const before = structuredClone(state)
  success({ exists: () => true, data: () => ({ ownerId: 'owner-a', version: 2, enforcement: { state: 'fully-enforced' } }) })
  assert.deepEqual(state, before)
  cleanup()
})

for (const [name, source] of [['Passport', passport], ['Consent', consent]]) {
  test(`${name} does not report an old export job in the next account`, async () => {
    const { env, state } = fixture()
    let resolve
    Object.assign(env, { canOperate: true, loadState: 'private', exportScopes: ['consent'],
      createOperationalExportRequest: () => new Promise((done) => { resolve = done }),
    })
    const body = source.match(/  const requestExport = async \(\) => \{([\s\S]*?)\n  \}/)[1]
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const pending = new AsyncFunction(...Object.keys(env), body)(...Object.values(env))
    env.authEpoch.current += 1
    state.Message = 'New account'
    resolve({ jobId: 'old-owner-private-job' })
    await pending
    assert.equal(state.Message, 'New account')
  })
}

test('Consent accepts a valid current-owner policy without replacing server authority', () => {
  const { env, state } = fixture()
  const policy = { ...unresolvedPolicy(), ownerId: 'owner-a', revision: 17 }
  env.onSnapshot = (_ref, callback) => { callback({ exists: () => true, data: () => policy }); return () => {} }
  run(effect(consent, 'const policyRef'), env)
  assert.equal(state.Policy, policy)
  assert.equal(state.LoadState, 'private')
  assert.equal(state.MutationState, 'pending')
})
