import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/app/home/useHomePersonalizedScene.ts', import.meta.url), 'utf8')

function harness() {
  const state = {}
  const names = ['online', 'signedIn', 'permissionsAvailable', 'dataAvailable', 'evidence', 'loading']
  const effects = []
  const requests = []
  const auth = { currentUser: null }
  let listener
  let stopped = false
  let index = 0
  const modules = {
    react: {
      useMemo: (fn) => fn(),
      useEffect: (fn) => effects.push(fn),
      useState(initial) {
        const name = names[index++]
        state[name] = typeof initial === 'function' ? initial() : initial
        return [state[name], value => { state[name] = value }]
      },
    },
    'firebase/auth': {
      getAuth: () => auth,
      onAuthStateChanged: (_, callback) => { listener = callback; return () => { stopped = true } },
    },
    'firebase/firestore': {
      collection: (...parts) => parts,
      limit: n => n,
      query: (...args) => args,
      getDocs: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => ({}) },
    './homePersonalizationModel': { buildHomePersonalizedScene: input => input },
  }
  const context = { exports: {}, require: name => {
    assert.ok(modules[name], `unexpected dependency: ${name}`)
    return modules[name]
  } }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  context.exports.useHomePersonalizedScene()
  const cleanup = effects[1]()
  return {
    state, requests, auth,
    emit(uid) { auth.currentUser = uid ? { uid } : null; return listener(auth.currentUser) },
    resolve(index, id) { requests[index].resolve({ docs: [{ id, data: () => ({ kind: 'emotional-weather' }) }] }) },
    cleanup,
    stopped: () => stopped,
  }
}

test('out-of-order account reads cannot replace the current owner evidence', async () => {
  const h = harness()
  const a = h.emit('A')
  const b = h.emit('B')
  h.resolve(1, 'B-private')
  await b
  h.resolve(0, 'A-private')
  await a
  assert.equal(h.state.evidence[0].id, 'B-private')
  assert.equal(h.state.dataAvailable, true)
  assert.equal(h.state.loading, false)
})

test('account changes clear mounted evidence immediately and stale errors cannot end the current load', async () => {
  const h = harness()
  const first = h.emit('A')
  h.resolve(0, 'A-private')
  await first
  const old = h.emit('A')
  const current = h.emit('B')
  assert.equal(h.state.evidence.length, 0)
  h.requests[1].reject(new Error('old account request failed'))
  await old
  assert.equal(h.state.loading, true)
  assert.equal(h.state.dataAvailable, true)
  h.resolve(2, 'B-private')
  await current
  assert.equal(h.state.evidence[0].id, 'B-private')
})

test('sign-out and same-account relogin invalidate earlier successes and failures', async () => {
  for (const rejected of [false, true]) {
    const h = harness()
    const old = h.emit('A')
    await h.emit(null)
    assert.equal(h.state.evidence.length, 0)
    assert.equal(h.state.signedIn, false)
    assert.equal(h.state.loading, false)
    const current = h.emit('A')
    if (rejected) h.requests[0].reject(new Error('stale'))
    else h.resolve(0, 'old-session-private')
    await old
    assert.equal(h.state.evidence.length, 0)
    assert.equal(h.state.loading, true)
    assert.equal(h.state.dataAvailable, true)
    h.resolve(1, 'new-session-private')
    await current
    assert.equal(h.state.evidence[0].id, 'new-session-private')
  }
})

test('identity changing before its auth callback prevents private response publication', async () => {
  const h = harness()
  const pending = h.emit('A')
  h.auth.currentUser = { uid: 'B' }
  h.resolve(0, 'A-private')
  await pending
  assert.equal(h.state.evidence.length, 0)
})

test('effect cleanup retires responses and current-account failures still fail closed', async () => {
  const h = harness()
  const pending = h.emit('A')
  h.cleanup()
  assert.equal(h.stopped(), true)
  const before = JSON.stringify(h.state)
  h.resolve(0, 'A-private')
  await pending
  assert.equal(JSON.stringify(h.state), before)
  const active = harness()
  const current = active.emit('B')
  active.requests[0].reject(new Error('denied'))
  await current
  assert.equal(active.state.evidence.length, 0)
  assert.equal(active.state.dataAvailable, false)
  assert.equal(active.state.loading, false)
})
