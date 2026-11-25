import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const now = 1800000000000
const response = (state = 'available', events = []) => ({ view: 'life-map', owner: 'owner', state, events, eras: [], issuedAt: now, validUntil: now + 30000 })
const memory = { id: 'memory', userId: 'owner', title: 'Synthetic memory', summary: 'Synthetic', replayAvailable: false, locked: false }

function fixture({ configured = true, request = async () => response('available', [memory]), userId = 'owner', clockSkew = 0 } = {}) {
  const auth = { currentUser: { uid: 'owner' } }, win = new EventTarget(), timers = new Map(), subscribers = new Set()
  const states = [], effects = []
  let stateIndex = 0, effectIndex = 0, timerId = 0, requests = 0, active = true
  const dependencies = {
    react: {
      useMemo: callback => callback(),
      useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
        return [states[index], value => { if (active) states[index] = typeof value === 'function' ? value(states[index]) : value }] },
      useEffect(callback, deps) { const index = effectIndex++, previous = effects[index]
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) { previous?.cleanup?.(); effects[index] = { deps, callback, pending: true } } },
    },
    'firebase/auth': { onAuthStateChanged: (_auth, listener) => { subscribers.add(listener); return () => subscribers.delete(listener) } },
    '../../lib/firebase/client': { firebasePublicEnvReady: configured, getUrAiAuth: () => auth },
    '../../lib/privacy/operationalPrivacyClient': { getOperationalLifeMapSnapshot: async () => { requests++; return request() } },
    '../../lib/uraiEmotion/manualWeatherSession': { MANUAL_WEATHER_RESET_EVENT: 'privacy-reset' },
    './canonicalLifeMapDemoNodes': { canonicalLifeMapDemoNodes: [{ id: 'sample' }] },
    './lifeMapLayout': { lifeMapDisplayPosition: () => [0, 0, 0] },
    './lifeMapData': { lifeMapEras: [{ id: 'sample-era' }], mapLifeMapEventToNode: event => event },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, window: win, Event,
    Date: class extends Date { static now() { return now + clockSkew } }, performance: { now: () => 500 },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id),
    require: id => { assert.ok(Object.hasOwn(dependencies, id), `Unexpected module ${id}`); return dependencies[id] },
  })
  function render() { stateIndex = 0; effectIndex = 0; const result = module.exports.useLifeMapEvents(userId)
    for (const effect of effects) if (effect.pending) { effect.pending = false; effect.cleanup = effect.callback() }
    return result }
  return { auth, win, timers, requests: () => requests, render,
    async settle() { render(); await new Promise(resolve => setImmediate(resolve)); return render() },
    revoke() { win.dispatchEvent(new Event('privacy-reset')) },
    retry() { module.exports.retryPrivateLifeMap() },
    changeOwner(user) { auth.currentUser = user; for (const subscriber of subscribers) subscriber(user) },
    cleanup() { for (const effect of effects) effect.cleanup?.(); active = false },
    fire(delay) { const found = [...timers].find(([, timer]) => timer.delay === delay); assert.ok(found); timers.delete(found[0]); found[1].callback() },
  }
}

test('actual private hook receives canonical metadata and keeps replay unavailable', async () => {
  const f = fixture(), state = await f.settle()
  assert.equal(state.sourceMode, 'private'); assert.equal(state.nodes[0].id, 'memory')
  assert.equal(state.nodes[0].replayAvailable, false); assert.equal(state.eras.length, 0)
  f.cleanup()
})
for (const state of ['denied', 'available']) test(`actual hook distinguishes ${state === 'denied' ? 'denied' : 'empty'} projection from read failure`, async () => {
  const f = fixture({ request: async () => response(state) }), result = await f.settle()
  assert.equal(result.sourceMode, state === 'denied' ? 'denied' : 'empty'); assert.equal(result.nodes.length, 0); f.cleanup()
})
test('provider failure is an error, never an empty or demo constellation', async () => {
  const f = fixture({ request: async () => { throw Error('unavailable') } }), result = await f.settle()
  assert.equal(result.sourceMode, 'error'); assert.equal(result.nodes.length, 0); f.cleanup()
})
test('transport failure after a denied response becomes error, not stale consent denial', async () => {
  let calls = 0
  const f = fixture({ request: async () => { if (++calls === 1) return response('denied'); throw Error('transport outage') } })
  assert.equal((await f.settle()).sourceMode, 'denied'); f.fire(15000)
  assert.equal((await f.settle()).sourceMode, 'error'); f.cleanup()
})
test('missing Firebase configuration issues no request and exposes no personal rows', async () => {
  const f = fixture({ configured: false }), result = await f.settle()
  assert.equal(result.sourceMode, 'unavailable'); assert.equal(f.requests(), 0); assert.equal(result.nodes.length, 0); f.cleanup()
})
test('explicit public sample is offline and remains distinct from private records', async () => {
  const f = fixture({ userId: 'demo-user' }), result = await f.settle()
  assert.equal(result.sourceMode, 'explicit-demo'); assert.equal(result.nodes[0].id, 'sample'); assert.equal(f.requests(), 0); f.cleanup()
})
test('withdrawal clears immediately and fences an in-flight successful response', async () => {
  const pending = Promise.withResolvers(), f = fixture({ request: () => pending.promise })
  f.render(); f.revoke(); pending.resolve(response('available', [memory]))
  const result = await f.settle()
  assert.equal(result.sourceMode, 'denied'); assert.equal(result.nodes.length, 0); assert.equal(f.timers.size, 0); f.cleanup()
})
test('auth switch clears the previous owner and fences old pending data', async () => {
  const pending = Promise.withResolvers(), f = fixture({ request: () => pending.promise })
  f.render(); f.changeOwner({ uid: 'other' }); pending.resolve(response('available', [memory]))
  const result = await f.settle(); assert.equal(result.nodes.length, 0); f.cleanup()
})
test('display lease clears private records when a refresh hangs', async () => {
  let calls = 0
  const f = fixture({ request: async () => ++calls === 1 ? response('available', [memory]) : new Promise(() => {}) })
  await f.settle(); f.fire(15000); f.fire(30000)
  const result = f.render(); assert.equal(result.nodes.length, 0); assert.equal(result.sourceMode, 'error'); f.cleanup()
})
test('cleanup cancels refresh and expiry timers', async () => {
  const f = fixture(); await f.settle(); assert.equal(f.timers.size, 2); f.cleanup(); assert.equal(f.timers.size, 0)
})
test('foreign owner or expired projection never becomes visible', async () => {
  for (const change of [{ owner: 'other' }, { validUntil: now }, { events: [{ ...memory, userId: 'other' }] }, { events: [{ ...memory, replayAvailable: true }] }]) {
    const f = fixture({ request: async () => ({ ...response('available', [memory]), ...change }) }), result = await f.settle()
    assert.equal(result.sourceMode, 'error'); assert.equal(result.nodes.length, 0); f.cleanup()
  }
})

test('client wall-clock skew cannot reject or extend a valid server-bounded display lease', async () => {
  for (const clockSkew of [-120000, 120000]) {
    const f = fixture({ clockSkew }), result = await f.settle()
    assert.equal(result.sourceMode, 'private'); assert.equal(result.nodes.length, 1)
    assert.ok([...f.timers.values()].some(timer => timer.delay === 30000)); f.cleanup()
  }
})
