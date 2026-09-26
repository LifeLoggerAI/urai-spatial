import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

// Run the production route callbacks/effects with controlled identity and async
// delivery. Navigation deliberately stays pending, as it can in a real browser.
function harness(pendingStage) {
  const states = [], refs = [], effects = [], memos = [], queued = [], calls = [], navigations = []
  let stateIndex = 0, refIndex = 0, effectIndex = 0, memoIndex = 0, release
  const blocked = new Promise(resolve => { release = resolve })
  const user = { uid: 'owner' }
  const metadata = { assetId: 'place', truthLabel: 'Source-backed reconstruction', label: 'Private place' }
  const delivery = { assetId: 'place', accessMode: 'runtime', url: 'https://private.invalid/scene', expiresAt: new Date(Date.now() + 600_000).toISOString(), truthLabel: metadata.truthLabel }
  const stage = async (name, result) => { calls.push(name); if (pendingStage === name) await blocked; return result }
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
    'firebase/firestore': { doc: (...args) => args, onSnapshot: (_, fn) => { fn({ get: key => key === 'enabled' ? true : 'granted', exists: () => true }); return () => {} } },
    'firebase/functions': { httpsCallable: (_, name) => async () => ({ data: await stage(name === 'getCapturedRealityAsset' ? 'metadata' : 'delivery', name === 'getCapturedRealityAsset' ? metadata : delivery) }) },
    'next/navigation': { useRouter: () => router, useSearchParams: () => new URLSearchParams('assetId=place') },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, functions: {}, getFirebaseDb: () => ({}) },
    '@/spatial/hooks/useReducedMotion': { useReducedMotion: () => true },
    '@/spatial/captured-reality/CapturedRealityPrivateScene': { default: () => null },
    '@/spatial/captured-reality/capturedRealityRuntime': { capturedRealityDeviceTier: () => 'desktop', CAPTURED_REALITY_QUALITY_PROFILES: { desktop: { maxRuntimeBytes: 4096 } }, capturedRealityBrowserCapability: () => ({ supported: true, missing: [] }) },
    '@/spatial/captured-reality/capturedRealityDelivery': { capturedRealityWebGL2Available: () => true, capturedRealityContentLengthAvailable: () => stage('header', true) },
  }
  const exports = {}
  vm.runInNewContext(source, { exports, require(id) { assert.ok(id in modules, `Unexpected import: ${id}`); return modules[id] }, AbortController, URLSearchParams, ReadableStream, Worker: class {}, navigator: { userAgent: 'desktop' }, window: { history: { length: 2 }, setTimeout: () => 1, clearTimeout() {} } })
  const render = () => { stateIndex = refIndex = effectIndex = memoIndex = 0; const tree = exports.default(); while (queued.length) queued.shift()(); return tree }
  const exitFrom = tree => {
    if (!tree || typeof tree !== 'object') return undefined
    if (tree?.type === 'button' && tree.props.children === 'Return to Replay') return tree.props.onClick
    for (const child of [tree?.props?.children].flat()) { const found = exitFrom(child); if (found) return found }
  }
  return { render, states, calls, navigations, release, exitFrom, cleanup() { effects.forEach(effect => effect.cleanup?.()) } }
}

for (const pending of ['metadata', 'delivery', 'header']) {
  test(`exit prevents a late ${pending} response from reopening the private scene before navigation completes`, async () => {
    const h = harness(pending)
    h.render(); h.render(); await settle()
    assert.equal(h.calls.at(-1), pending)
    const exit = h.exitFrom(h.render())
    assert.equal(typeof exit, 'function')
    exit()
    h.release(); await settle()
    assert.deepEqual(h.navigations, ['back'])
    assert.equal(h.states[2], null, 'late response must not restore delivery')
    assert.equal(h.states[1], null, 'private metadata must clear on exit')
    assert.equal(h.states[3].mode, 'suppressed', 'late response must not remount a splat')
    assert.equal(h.states[5], false, 'provenance must close on exit')
    assert.equal(h.calls.at(-1), pending, 'no downstream delivery stage may start after exit')
    h.cleanup()
  })
}
