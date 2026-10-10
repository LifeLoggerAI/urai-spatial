import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Actual hook; only Auth, callable delivery and effect ordering are controlled.
// No remote service or private source is accessed.
const source = fs.readFileSync(new URL('../src/spatial/life-model/useReplayLifeModelAuthority.ts', import.meta.url), 'utf8')
const success = (packet = 'synthetic-scene') => ({ data: {
  available: true, schemaVersion: 'urai-life-model-v1', sceneTruthPacketId: packet,
  personModelBundleIds: [], people: [], decision: 'READY', presentationClass: 'synthetic',
  syntheticOutputMayBecomeHistoricalSource: false,
} })

function mount() {
  let cursor = 0, memoryId = 'synthetic-memory-one', demo = false, writes = 0
  const slots = [], effects = [], listeners = new Set(), calls = []
  const auth = { currentUser: null }
  const react = {
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, value => {
        writes += 1
        slots[index].value = typeof value === 'function' ? value(slots[index].value) : value
      }]
    },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index]
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        slots[index] = { deps, cleanup: previous?.cleanup }
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect() })
      }
    },
  }
  const imports = {
    react,
    'firebase/auth': {
      getAuth: () => auth,
      onAuthStateChanged(_auth, callback) { listeners.add(callback); callback(auth.currentUser); return () => listeners.delete(callback) },
    },
    'firebase/functions': {
      httpsCallable: () => data => {
        let resolve, reject
        const promise = new Promise((a, b) => { resolve = a; reject = b })
        calls.push({ data, resolve, reject })
        return promise
      },
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, functions: {} },
  }
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { module, exports: module.exports, require(name) { assert.ok(name in imports, name); return imports[name] } })
  const render = () => { cursor = 0; return module.exports.useReplayLifeModelAuthority(memoryId, demo) }
  const flushEffects = () => { while (effects.length) effects.shift()() }
  render(); flushEffects()
  return {
    auth, calls, render, flushEffects,
    get writes() { return writes }, get listenerCount() { return listeners.size },
    emit(user) { auth.currentUser = user; for (const callback of [...listeners]) callback(user) },
    select(id, asDemo = false) { memoryId = id; demo = asDemo },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
    async resolve(index, result) { calls[index].resolve(result); await Promise.resolve(); await Promise.resolve() },
    async reject(index) { calls[index].reject(new Error('Synthetic authority failure')); await Promise.resolve(); await Promise.resolve() },
  }
}

test('current authenticated lookup retains the valid authority response', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' })
  assert.equal(h.render().status, 'loading')
  await h.resolve(0, success())
  assert.equal(h.render().available, true)
  assert.equal(h.render().sceneTruthPacketId, 'synthetic-scene')
  h.unmount()
})
test('older same-UID session success cannot overwrite a newer session denial', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); h.emit(null); h.emit({ uid: 'synthetic-owner' })
  await h.resolve(1, { data: { available: false, reason: 'MODEL_CONSENT_REQUIRED' } })
  await h.resolve(0, success('synthetic-old-scene'))
  assert.equal(h.render().available, false)
  assert.equal(h.render().reason, 'MODEL_CONSENT_REQUIRED')
  h.unmount()
})
test('older same-UID session denial cannot replace newer valid authority', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); h.emit(null); h.emit({ uid: 'synthetic-owner' })
  await h.resolve(1, success('synthetic-current-scene'))
  await h.resolve(0, { data: { available: false, reason: 'OLD_SESSION_DENIED' } })
  assert.equal(h.render().available, true)
  assert.equal(h.render().sceneTruthPacketId, 'synthetic-current-scene')
  h.unmount()
})
test('a repeated auth callback fences older request even with the same User object', async () => {
  const h = mount(), user = { uid: 'synthetic-owner' }; h.emit(user); h.emit(user)
  await h.resolve(1, { data: { available: false, reason: 'CURRENT_DENIAL' } })
  await h.resolve(0, success())
  assert.equal(h.render().available, false)
  assert.equal(h.render().reason, 'CURRENT_DENIAL')
  h.unmount()
})
test('changed current User masks authority before its callback commits', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); await h.resolve(0, success())
  h.auth.currentUser = { uid: 'synthetic-owner' }
  assert.equal(h.render().available, false)
  h.unmount()
})
test('sign-out masks authority before its listener commits', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); await h.resolve(0, success())
  h.auth.currentUser = null
  assert.equal(h.render().available, false)
  h.unmount()
})
test('query changes mask earlier authority before replacement effects', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); await h.resolve(0, success())
  h.select('synthetic-memory-two')
  assert.equal(h.render().available, false)
  h.unmount()
})
test('demo selection never retains private Life Model authority', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); await h.resolve(0, success())
  h.select('synthetic-memory-one', true)
  assert.equal(h.render().available, false)
  h.flushEffects(); assert.equal(h.calls.length, 1)
  h.unmount()
})
test('late prior-memory success cannot overwrite a new-memory denial', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' })
  h.select('synthetic-memory-two'); h.render(); h.flushEffects()
  assert.equal(h.calls[1].data.memoryId, 'synthetic-memory-two')
  await h.resolve(1, { data: { available: false, reason: 'CURRENT_MEMORY_DENIED' } })
  await h.resolve(0, success())
  assert.equal(h.render().available, false)
  assert.equal(h.render().reason, 'CURRENT_MEMORY_DENIED')
  h.unmount()
})
test('unmount invalidates pending completions and detaches auth', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); h.unmount()
  const writes = h.writes
  await h.resolve(0, success())
  assert.equal(h.writes, writes)
  assert.equal(h.listenerCount, 0)
})
test('old session rejection cannot replace newer valid authority', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); h.emit(null); h.emit({ uid: 'synthetic-owner' })
  await h.resolve(1, success()); await h.reject(0)
  assert.equal(h.render().available, true)
  h.unmount()
})
test('current errors and malformed authority remain unavailable', async () => {
  const h = mount(); h.emit({ uid: 'synthetic-owner' }); await h.reject(0)
  assert.equal(h.render().available, false)
  assert.equal(h.render().reason, 'LIFE_MODEL_LOOKUP_FAILED')
  h.emit(h.auth.currentUser)
  await h.resolve(1, { data: { available: true, schemaVersion: 'wrong', people: [], personModelBundleIds: [] } })
  assert.equal(h.render().available, false)
  h.unmount()
})
