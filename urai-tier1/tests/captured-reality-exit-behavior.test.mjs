import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as deliveryControls from '../src/spatial/captured-reality/capturedRealityDelivery.ts'
import * as journeyControls from '../src/spatial/captured-reality/capturedRealityJourney.ts'
import * as selectedMemoryControls from '../src/spatial/memory/selectedMemoryContract.ts'

const source = ts.transpileModule(fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

// Run the production route callbacks/effects with controlled identity and async
// delivery. Navigation deliberately stays pending, as it can in a real browser.
function harness(pendingStage) {
  const states = [], refs = [], effects = [], memos = [], queued = [], calls = [], navigations = [], listeners = []
  const timers = new Map()
  let timerId = 0
  let stateIndex = 0, refIndex = 0, effectIndex = 0, memoIndex = 0, release
  const blocked = new Promise(resolve => { release = resolve })
  const user = { uid: 'owner', getIdToken: async () => 'synthetic-token' }
  const metadata = { assetId: 'place', truthLabel: 'Source-backed reconstruction', label: 'Private place' }
  const delivery = { assetId: 'place', accessMode: 'runtime', deviceTier: 'desktop', url: 'https://us-central1-urai-4dc1d.cloudfunctions.net/streamCapturedRealityRuntime?assetId=place&accessMode=runtime&deviceTier=desktop&deliveryId=' + 'b'.repeat(64), requiresAuthorization: true, runtimeSha256: 'a'.repeat(64), runtimeByteLength: 96, storageGeneration: '123', expiresAt: new Date(Date.now() + 600_000).toISOString(), truthLabel: metadata.truthLabel }
  const stage = async (name, result) => { calls.push(name); if (pendingStage === name) await blocked; return typeof result === 'object' ? { ...result } : result }
  const router = { back: () => navigations.push('back'), push: path => navigations.push(path) }
  const memo = (fn, deps) => { const i = memoIndex++; const previous = memos[i]; if (!previous || deps.some((value, j) => value !== previous.deps[j])) memos[i] = { deps, value: fn() }; return memos[i].value }
  const react = {
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
    useRef(value) { const i = refIndex++; return refs[i] ??= { current: value } },
    useCallback: (fn, deps) => memo(() => fn, deps),
    useMemo: memo,
    useEffect(fn, deps) { const i = effectIndex++; const previous = effects[i]; if (!previous || deps.some((value, j) => value !== previous.deps[j])) queued.push(() => { previous?.cleanup?.(); effects[i] = { deps, cleanup: fn() } }) },
  }
  const modules = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'firebase/auth': { getAuth: () => ({ currentUser: user }), onAuthStateChanged: (_, fn) => { fn(user); return () => {} } },
    'firebase/firestore': { doc: (...args) => args, onSnapshot: (ref, fn, onError) => {
      const refParts = Array.isArray(ref) ? ref : [ref]
      const isAsset = refParts.some(part => String(part).includes('capturedRealityAssets'))
      const authority = isAsset
        ? { ownerId: 'owner', state: 'ready', reviewState: 'accepted', releaseState: 'private-pilot' }
        : null
      const listener = { ref, fn, onError, authority }
      listeners.push(listener)
      fn({ get: key => authority ? authority[key]
        : key === 'enabled' || key === 'domains.memory.replayVisible' ? true : key === 'ownerId' ? 'owner' : key === 'version' ? 2
          : key === 'revision' ? 1 : key === 'enforcement.state' ? 'fully-enforced' : 'granted', exists: () => true })
      return () => {}
    } },
    'firebase/functions': { httpsCallable: (_, name) => async () => ({ data: await stage(name === 'getCapturedRealityAsset' ? 'metadata' : 'delivery', name === 'getCapturedRealityAsset' ? metadata : delivery) }) },
    'next/navigation': { useRouter: () => router, useSearchParams: () => new URLSearchParams('assetId=place&memoryId=memory-1') },
    '@/lib/firebase/client': { app: { options: { projectId: 'urai-4dc1d' } }, firebasePublicEnvReady: true, functions: {}, getFirebaseDb: () => ({}) },
    '@/spatial/adam/AdamLauncherSlot': { default: () => null },
    '@/spatial/hooks/useReducedMotion': { useReducedMotion: () => true },
    '@/spatial/captured-reality/CapturedRealityPrivateScene': { default: () => null },
    '@/spatial/captured-reality/useCapturedRealityReplayEntry': { useCapturedRealityReplayLookup: () => ({ status: 'available', entry: { assetId: 'place' } }) },
    '@/spatial/captured-reality/capturedRealityRuntime': { capturedRealityDeviceTier: () => 'desktop', CAPTURED_REALITY_QUALITY_PROFILES: { desktop: { maxRuntimeBytes: 4096 } }, capturedRealityBrowserCapability: () => ({ supported: true, missing: [] }) },
    '@/spatial/captured-reality/capturedRealityDelivery': { ...deliveryControls, capturedRealityWebGL2Available: () => true, capturedRealityContentLengthAvailable: () => stage('header', true) },
  }
  modules['@/spatial/captured-reality/capturedRealityJourney'] = journeyControls
  modules['@/spatial/memory/selectedMemoryContract'] = selectedMemoryControls
  const exports = {}
  vm.runInNewContext(source, { exports, require(id) { assert.ok(id in modules, `Unexpected import: ${id}`); return modules[id] }, AbortController, URLSearchParams, ReadableStream, fetch, Worker: class {}, navigator: { userAgent: 'desktop' }, window: {
    history: { length: 2 }, setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id }, clearTimeout(id) { timers.delete(id) },
  } })
  const render = () => { stateIndex = refIndex = effectIndex = memoIndex = 0; const tree = exports.default(); while (queued.length) queued.shift()(); return tree }
  const exitFrom = tree => {
    if (!tree || typeof tree !== 'object') return undefined
    if (tree?.type === 'button' && tree.props.children === 'Return to memory') return tree.props.onClick
    for (const child of [tree?.props?.children].flat()) { const found = exitFrom(child); if (found) return found }
  }
  return { render, states, calls, navigations, listeners, release, exitFrom, delivery, timers, cleanup() { effects.forEach(effect => effect.cleanup?.()) } }
}

test('loaded private scenes recheck current authority every30seconds and close on a new artifact generation', async () => {
  const h = harness(null)
  for (let i = 0; i < 8; i++) { h.render(); await settle() }
  assert.equal(h.states[4].kind, 'ready')
  const heartbeat = [...h.timers.values()].find(timer => timer.ms === 30_000)
  assert.ok(heartbeat, 'loaded geometry must recheck current server authority without waiting10minutes')
  h.delivery.storageGeneration = '124'
  heartbeat.fn(); await settle()
  assert.equal(h.states[2], null)
  assert.equal(h.states[3].mode, 'suppressed')
  assert.equal(h.states[4].kind, 'suppressed')
  h.cleanup()
})

test('private route rejects predecessor signed capabilities before any renderer probe', async () => {
  const h = harness(null)
  h.delivery.requiresAuthorization = false
  h.delivery.url = 'https://storage.googleapis.com/synthetic/private?signature=redacted'
  for (let i = 0; i < 8; i++) { h.render(); await settle() }
  assert.equal(h.states[4].kind, 'error')
  assert.equal(h.states[2], null)
  assert.equal(h.calls.includes('header'), false)
  h.cleanup()
})

test('pending or foreign consent authority tears down already-loaded private resources before the next heartbeat', async () => {
  for (const patch of [{ 'enforcement.state': 'pending' }, { ownerId: 'foreign' }, { revision: 0 }, { version: 1 }, { 'domains.memory.replayVisible': false }]) {
    const h = harness(null)
    for (let i = 0; i < 8; i++) { h.render(); await settle() }
    assert.equal(h.states[4].kind, 'ready')
    const policy = h.listeners.find(listener => listener.ref.includes('privacyPolicy'))
    assert.ok(policy)
    const values = { ownerId: 'owner', version: 2, revision: 1, 'enforcement.state': 'fully-enforced', 'domains.memory.replayVisible': true, ...patch }
    policy.fn({ exists: () => true, get: key => values[key] ?? 'granted' })
    assert.equal(h.states[2], null)
    assert.equal(h.states[3].mode, 'suppressed')
    h.cleanup()
  }
})

for (const pending of ['metadata', 'delivery', 'header']) {
  test(`exit prevents a late ${pending} response from reopening the private scene before navigation completes`, async () => {
    const h = harness(pending)
    h.render(); h.render(); await settle()
    assert.equal(h.calls.at(-1), pending)
    const exit = h.exitFrom(h.render())
    assert.equal(typeof exit, 'function')
    exit()
    h.release(); await settle()
    assert.deepEqual(h.navigations, ['/replay?memoryId=memory-1'])
    assert.equal(h.states[2], null, 'late response must not restore delivery')
    assert.equal(h.states[1], null, 'private metadata must clear on exit')
    assert.equal(h.states[3].mode, 'suppressed', 'late response must not remount a splat')
    assert.equal(h.states[5], false, 'provenance must close on exit')
    assert.equal(h.calls.at(-1), pending, 'no downstream delivery stage may start after exit')
    h.cleanup()
  })
}

for (const stage of ['metadata', null]) {
  test(`asset revocation closes the private scene${stage ? ' during metadata load' : ' after authorization'}`, async () => {
    const h = harness(stage)
    h.render(); h.render(); await settle()
    if (stage) assert.equal(h.calls.at(-1), 'metadata')
    else {
      for (let i = 0; i < 8; i++) { h.render(); await settle() }
      assert.ok(h.calls.includes('delivery'))
    }
    const assetListener = h.listeners.find(listener => (Array.isArray(listener.ref) ? listener.ref : [listener.ref]).some(part => String(part).includes('capturedRealityAssets')))
    assert.ok(assetListener)
    assetListener.fn({ exists: () => true, get: key => ({ ownerId: 'owner', state: 'revoked', reviewState: 'accepted', releaseState: 'private-pilot' }[key]) })
    assert.equal(h.states[2], null)
    assert.equal(h.states[3].mode, 'suppressed')
    if (stage) {
      h.release(); await settle()
      assert.equal(h.calls.at(-1), 'metadata', 'revocation during metadata load must stop delivery')
    }
    h.cleanup()
  })
}
