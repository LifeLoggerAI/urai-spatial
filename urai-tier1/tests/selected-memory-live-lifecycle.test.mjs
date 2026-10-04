import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

function load(relative, imports, globals = {}) {
  const source = fs.readFileSync(path.resolve('src/spatial/memory', relative), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const module = { exports: {} }
  vm.runInNewContext(outputText, { ...globals, exports: module.exports, module, require(id) { assert.ok(id in imports, `Unexpected dependency ${id}`); return imports[id] } }, { filename: relative })
  return module.exports
}

function hooks() {
  const slots = []
  let cursor = 0
  let queued = []
  let dirty = false
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const react = {
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; dirty = true }]
    },
    useMemo(factory, deps) {
      const index = cursor++
      if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps }
      return slots[index].value
    },
    useEffect(effect, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || changed(previous.deps, deps)) {
        slots[index] = { deps, cleanup: previous?.cleanup }
        queued.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() })
      }
    },
  }
  return {
    react,
    render(owner) {
      for (let attempt = 0; attempt < 20; attempt++) {
        dirty = false; cursor = 0
        const result = owner()
        const effects = queued; queued = []
        effects.forEach(effect => effect())
        if (!dirty) return result
      }
      throw new Error('Selected memory hook did not settle')
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}

function harness(search = '?memoryId=memory-one') {
  const driver = hooks()
  const subscriptions = []
  let authCallback
  let authStopped = false
  const listeners = new Map()
  const browser = {
    location: { search }, localStorage: { getItem: () => null },
    addEventListener(name, listener) { listeners.set(name, listener) },
    removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name) },
  }
  const contract = load('selectedMemoryContract.ts', {}, { URL })
  const owner = load('useSelectedMemory.ts', {
    react: driver.react,
    'firebase/auth': { getAuth: () => ({}), onAuthStateChanged(_auth, callback) { authCallback = callback; return () => { authStopped = true } } },
    'firebase/firestore': {
      doc: (...parts) => parts,
      onSnapshot(ref, receive, error) {
        const subscription = { ref, receive, error, stopped: false }
        subscriptions.push(subscription)
        return () => { subscription.stopped = true }
      },
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => ({}) },
    './selectedMemoryContract': contract,
    './explicitDemoMemory': { buildNamedExplicitDemoMemory: contract.buildExplicitDemoMemory },
  }, { window: browser, URLSearchParams, process: { env: { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'governed-bucket' } } })
  const render = () => driver.render(owner.useSelectedMemory)
  render()
  const data = (uid = 'account-a', id = 'memory-one') => ({ ...contract.buildExplicitDemoMemory(id), ownerId: uid, demo: false })
  const snapshot = (value) => ({ exists: () => value !== null, data: () => value })
  return {
    render, subscriptions, data,
    signIn(uid) { authCallback(uid ? { uid } : null); return render() },
    emit(index, value) { subscriptions[index].receive(snapshot(value)); return render() },
    error(index) { subscriptions[index].error(new Error('provider-private-details')); return render() },
    navigate(nextSearch) { browser.location.search = nextSearch; listeners.get('popstate')?.(); return render() },
    unmount: () => driver.unmount(), authStopped: () => authStopped, listeners,
  }
}

test('live private memory loads only from the authenticated owner path', () => {
  const h = harness()
  assert.equal(h.signIn('account-a').status, 'loading')
  assert.deepEqual(h.subscriptions[0].ref.slice(1), ['users', 'account-a', 'memories', 'memory-one'])
  const result = h.emit(0, h.data())
  assert.equal(result.status, 'ready')
  assert.equal(result.memory.ownerId, 'account-a')
})

test('sign-out clears memory and rejects queued callbacks from the detached subscription', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  assert.equal(h.signIn(null).status, 'unauthorized')
  assert.equal(h.subscriptions[0].stopped, true)
  assert.equal(h.emit(0, h.data()).memory, null)
})

test('late prior-account data or errors cannot win after an account switch', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  assert.equal(h.signIn('account-b').memory, null)
  assert.equal(h.subscriptions[0].stopped, true)
  h.emit(1, h.data('account-b'))
  assert.equal(h.emit(0, h.data()).memory.ownerId, 'account-b')
  assert.equal(h.error(0).memory.ownerId, 'account-b')
})

test('observed consent revocation clears a previously loaded memory immediately', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  const revoked = h.emit(0, { ...h.data(), consentState: 'revoked' })
  assert.equal(revoked.status, 'unauthorized')
  assert.equal(revoked.memory, null)
})

test('deleted or missing snapshots remove loaded media identity', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  assert.equal(h.emit(0, { ...h.data(), deleted: true }).status, 'deleted')
  assert.equal(h.emit(0, null).memory, null)
})

test('snapshot permission/network errors clear memory without exposing provider details', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  const result = h.error(0)
  assert.equal(result.status, 'unavailable')
  assert.equal(result.memory, null)
  assert.doesNotMatch(result.message, /provider-private-details/)
})

test('same-path Back/Forward query changes detach the old selection before new data', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  assert.equal(h.navigate('?memoryId=memory-two').memory, null)
  assert.equal(h.subscriptions[0].stopped, true)
  h.signIn('account-a')
  assert.deepEqual(h.subscriptions[1].ref.slice(1), ['users', 'account-a', 'memories', 'memory-two'])
  h.emit(1, h.data('account-a', 'memory-two'))
  assert.equal(h.emit(0, h.data()).memory.id, 'memory-two')
})

test('manifest mismatch fails closed even on a previously loaded source', () => {
  const h = harness('?memoryId=memory-one&manifestId=wrong-manifest'); h.signIn('account-a')
  const result = h.emit(0, h.data())
  assert.equal(result.status, 'corrupt')
  assert.equal(result.memory, null)
})

test('unmount detaches auth, query and source owners and invalidates pending callbacks', () => {
  const h = harness(); h.signIn('account-a'); h.emit(0, h.data())
  h.unmount()
  assert.equal(h.subscriptions[0].stopped, true)
  assert.equal(h.authStopped(), true)
  assert.equal(h.listeners.size, 0)
})

test('explicitly disclosed demo never starts a private source subscription', () => {
  const h = harness('?demo=1&memoryId=demo:sample')
  const result = h.render()
  assert.equal(result.status, 'demo')
  assert.equal(result.memory.id, 'demo:sample')
  assert.equal(result.memory.demo, true)
  assert.equal(h.subscriptions.length, 0)
})
