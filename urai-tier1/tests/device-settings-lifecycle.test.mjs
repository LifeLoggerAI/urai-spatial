import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function fixture() {
  const slots = [], effects = [], requests = [], navigations = []
  const auth = { currentUser: null }
  let cursor = 0, dirty = false, callback, tree
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value } },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { if (slots[i] !== next) { slots[i] = next; dirty = true } }] },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i]) { slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn() }) } },
  }
  const jsx = (type, props) => ({ type, props })
  const dependencies = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'a' },
    'firebase/auth': { getAuth: () => auth, onAuthStateChanged(_auth, fn) { callback = fn; fn(auth.currentUser); return () => { callback = null } } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/spatial/haptics/HapticRuntime': { setHapticsEnabled() {}, URAI_HAPTICS_STORAGE_KEY: 'haptics' },
    '@/spatial/settings/spatialSettingsStore': { useSpatialSettingsStore: select => select({ reducedMotion: false, setReducedMotion() {} }) },
  }
  const exports = {}
  const source = fs.readFileSync(new URL('../src/app/settings/DeviceSettingsClient.tsx', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, navigator: {}, URLSearchParams,
    window: { localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null }, location: { search: '', assign: url => navigations.push(url) }, matchMedia: () => ({ matches: false }) },
    fetch: path => new Promise((resolve, reject) => requests.push({ path, reject, resolve: body => resolve({ ok: true, json: async () => body }) })),
    require: id => { if (!(id in dependencies)) throw Error(id); return dependencies[id] },
  })
  function render() { let turns = 0; do { dirty = false; cursor = 0; tree = exports.default(); while (effects.length) effects.shift()(); assert.ok(++turns < 20) } while (dirty) }
  function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [] }
  async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); render() }
  render()
  return {
    requests, navigations, settle, render,
    nodes: () => nodes(tree), text: () => JSON.stringify(tree),
    async user(uid, token) { auth.currentUser = uid ? { uid, getIdToken: () => token ?? Promise.resolve('test-token') } : null; callback(auth.currentUser); await settle() },
    button(label) { return nodes(tree).find(n => n.type === 'button' && n.props.children === label) },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
}

test('Settings clears the previous connection immediately and ignores a late status response', async () => {
  const f = fixture(); await f.user('a'); const first = f.requests.at(-1)
  await f.user('b'); const second = f.requests.at(-1)
  first.resolve({ connected: true }); await f.settle()
  assert.equal(f.button('Disconnect'), undefined)
  second.resolve({ connected: true }); await f.settle()
  assert.ok(f.button('Disconnect'))
  await f.user(null)
  assert.equal(f.button('Disconnect'), undefined)
  assert.match(f.text(), /Sign in to connect/)
})

test('late authorization cannot navigate after sign-out or same-account relogin', async () => {
  const f = fixture(); await f.user('a'); f.requests.at(-1).resolve({ connected: false }); await f.settle()
  f.button('Connect Google').props.onClick(); await f.settle(); const start = f.requests.at(-1)
  await f.user(null); await f.user('a')
  start.resolve({ authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?test=1' }); await f.settle()
  assert.deepEqual(f.navigations, [])
  assert.match(f.text(), /Checking this account/)
})

test('account change during token acquisition prevents the request from starting', async () => {
  let release; const token = new Promise(resolve => { release = resolve })
  const f = fixture(); await f.user('a', token); await f.user(null)
  release('test-token'); await f.settle()
  assert.equal(f.requests.length, 0)
  assert.match(f.text(), /Sign in to connect/)
})

test('late disconnect completion cannot overwrite another account and unmount invalidates status', async () => {
  const f = fixture(); await f.user('a'); f.requests.at(-1).resolve({ connected: true }); await f.settle()
  f.button('Disconnect').props.onClick(); await f.settle(); const disconnect = f.requests.at(-1)
  await f.user('b'); const status = f.requests.at(-1)
  disconnect.resolve({ connected: false }); await f.settle()
  assert.match(f.text(), /Checking this account/)
  f.unmount(); status.resolve({ connected: true }); await f.settle()
  assert.equal(f.button('Disconnect'), undefined)
})

test('current owner can authorize Google and sensory controls have distinct names and touch areas', async () => {
  const f = fixture(); await f.user('a'); f.requests.at(-1).resolve({ connected: false }); await f.settle()
  f.button('Connect Google').props.onClick(); await f.settle()
  f.requests.at(-1).resolve({ authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?test=1' }); await f.settle()
  assert.equal(f.navigations.length, 1)
  const inputs = f.nodes().filter(n => n.type === 'input')
  assert.deepEqual(inputs.map(n => n.props['aria-labelledby']), ['motion-heading', 'haptics-heading', 'audio-heading'])
  for (const label of f.nodes().filter(n => n.type === 'label')) assert.ok(label.props.style.minHeight >= 48)
})
