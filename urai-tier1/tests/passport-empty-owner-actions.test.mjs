import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

// Execute the production component with explicit hook/Auth/callable adapters.
// These are synthetic component tests: no Firebase SDK, network, or private data.
const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/app/passport/PassportVaultClient.tsx'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText
const children = tree => Array.isArray(tree?.props?.children) ? tree.props.children.flat(Infinity) : [tree?.props?.children]
const nodes = tree => tree && typeof tree === 'object' ? [tree, ...children(tree).flatMap(nodes)] : []
const text = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? children(tree).map(text).join('') : String(tree)
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function fixture({ owner = { uid: 'synthetic-owner' }, demo = false, configured = true, online = true,
  keyState = 'authorized', sources = [], snapshotResult } = {}) {
  let cursor = 0, dirty = true, mounted = true, tree
  const slots = [], queued = [], authListeners = new Set(), listeners = new Map(), subscriptions = new Map()
  const state = { owner, online, keyState, sources, snapshotResult }
  const calls = { snapshots: 0, exports: [], deletions: [], downloads: [], stops: 0 }
  const auth = { get currentUser() { return state.owner } }
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]))
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true }] },
    useRef(initial) { const i = cursor++; slots[i] ??= { value: { current: initial } }; return slots[i].value },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { value: factory(), deps }; return slots[i].value },
    useEffect(effect, deps) { const i = cursor++, old = slots[i]; if (!old || changed(old.deps, deps)) { slots[i] = { deps, cleanup: old?.cleanup }; queued.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect() }) } },
  }
  const snapshot = () => ({ owner: { keyState: state.keyState, ownerReference: 'synthetic-reference' }, consent: { revision: 3 },
    sources: state.sources, devices: [], receipts: [], exports: [], deletions: [] })
  const payload = { displayName: 'Disclosed sample', sources: [], devices: [], receipts: [] }
  class DownloadSession {
    revision = 0
    active = false
    stop() { this.revision++; this.active = false; calls.stops++ }
    async download(request, current) { this.revision++; this.active = true; assert.equal(current(), true); calls.downloads.push(request); this.active = false }
  }
  const imports = {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/dynamic': () => () => null,
    'firebase/auth': { getAuth: () => auth, onAuthStateChanged: (_auth, callback) => { authListeners.add(callback); callback(state.owner); return () => authListeners.delete(callback) } },
    '@/hooks/useReducedMotion': { useReducedMotion: () => false },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: configured },
    '@/spatial/assets/uraiAssets': { assetCssStack: () => '', passportAssets: { primary: [] } },
    '@/lib/privacy/authorizedExportDownload': { OperationalExportDownloadSession: DownloadSession },
    '@/lib/privacy/operationalPrivacyClient': {
      getOperationalPassportSnapshot: async () => { calls.snapshots++; return state.snapshotResult ? state.snapshotResult() : snapshot() },
      subscribeOperationalUserCollection: (name, _uid, callback) => { subscriptions.set(name, callback); return () => subscriptions.delete(name) },
      createOperationalExportRequest: async scopes => { calls.exports.push([...scopes]); return state.exportResult ? state.exportResult() : { jobId: 'synthetic-export' } },
      createOperationalDeletionRequest: async request => { calls.deletions.push({ ...request }); return { jobId: 'synthetic-deletion', state: 'queued' } },
      cancelOperationalDeletionRequest: async () => {}, cancelOperationalExportRequest: async () => {}, downloadOperationalExportBytes: async () => {},
    },
    './passportModel': { demoPassportSnapshot: () => payload, redactPassportSnapshot: value => value },
    './passportZones': { ZONES: [['identity', 'Identity core'], ['exports', 'Export chamber'], ['deletion', 'Deletion chamber']] },
    '@/spatial/adam/AdamLauncherSlot': () => null, './passport-vault.css': {},
  }
  const module = { exports: {} }
  const browser = { location: { search: demo ? '?demo=1' : '', assign() {} }, history: { length: 1, back() {} },
    addEventListener: (name, fn) => { const group = listeners.get(name) ?? new Set(); group.add(fn); listeners.set(name, group) },
    removeEventListener: (name, fn) => listeners.get(name)?.delete(fn) }
  vm.runInNewContext(code, { exports: module.exports, module, URLSearchParams, DOMException, AbortController,
    window: browser, document: { createElement: () => ({ getContext: () => null }), getElementById: () => ({ focus() {} }) },
    navigator: { get onLine() { return state.online } }, require: name => { assert.ok(name in imports, `Unexpected import ${name}`); return imports[name] },
  }, { filename: 'actual-PassportVaultClient.tsx' })
  const render = () => {
    for (let i = 0; dirty && mounted && i < 25; i++) { dirty = false; cursor = 0; tree = module.exports.default(); while (queued.length) queued.shift()() }
    assert.equal(dirty, false, 'component must settle')
  }
  const flush = async () => { for (let i = 0; i < 8; i++) { render(); await Promise.resolve() } render() }
  render()
  return {
    state, calls, flush, get tree() { return tree },
    button: label => { const found = nodes(tree).find(n => n.type === 'button' && text(n) === label); assert.ok(found, label); return found },
    confirmation: value => { const input = nodes(tree).find(n => n.type === 'input' && n.props.type !== 'checkbox'); assert.ok(input); input.props.onChange({ target: { value } }); render() },
    async click(label) { const button = this.button(label); assert.equal(Boolean(button.props.disabled), false, `${label} must be available`); button.props.onClick(); await flush() },
    updateOwner(owner) { state.owner = owner; for (const listener of authListeners) listener(owner); render() },
    offline() { state.online = false; for (const listener of listeners.get('offline') ?? []) listener(); render() },
    exportRows(rows) { subscriptions.get('exportJobs')?.(rows); render() },
    unmount() { mounted = false; for (const slot of slots) slot.cleanup?.() },
  }
}

test('an empty authenticated owner can choose scopes and request an export', async () => {
  const f = fixture(); await f.flush()
  assert.equal(f.tree.props['data-passport-source'], 'empty')
  assert.equal(f.tree.props['data-key-state'], 'authorized')
  const boxes = nodes(f.tree).filter(n => n.type === 'input' && n.props.type === 'checkbox')
  assert.ok(boxes.every(n => !n.props.disabled))
  await f.click('Unlock and request export')
  assert.deepEqual(f.calls.exports, [['profile', 'consent', 'audit']])
  assert.match(text(f.tree), /synthetic-.*queued/)
  assert.doesNotMatch(text(f.tree), /represented as ready|called deleted/)
})

test('an empty authenticated owner can request correctly confirmed deletion', async () => {
  const f = fixture(); await f.flush()
  f.confirmation('CONFIRM DELETE')
  await f.click('Unlock and create deletion request')
  assert.deepEqual(f.calls.deletions, [{ scope: 'memories', confirmation: 'CONFIRM DELETE' }])
  assert.match(text(f.tree), /entered queued/)
})

test('empty-vault deletion still requires the exact confirmation', async () => {
  const f = fixture(); await f.flush()
  f.confirmation('wrong confirmation')
  await f.click('Unlock and create deletion request')
  assert.deepEqual(f.calls.deletions, [])
  assert.match(text(f.tree), /exactly for this deletion scope/)
})

test('empty-vault actions still require server-derived recent-auth authority', async () => {
  const f = fixture({ keyState: 'available' }); await f.flush()
  await f.click('Unlock and request export')
  assert.deepEqual(f.calls.exports, [])
  assert.match(text(f.tree), /recent sign-in/)
  f.confirmation('CONFIRM DELETE')
  await f.click('Unlock and create deletion request')
  assert.deepEqual(f.calls.deletions, [])
})

test('an empty snapshot can download a ready export delivered by its current subscription', async () => {
  const f = fixture(); await f.flush()
  f.exportRows([{ id: 'synthetic-current-export', state: 'ready', scopes: ['profile'] }])
  assert.equal(f.tree.props['data-passport-source'], 'empty')
  await f.click('Secure download')
  assert.equal(f.calls.downloads.length, 1)
  assert.equal(f.calls.downloads[0].jobId, 'synthetic-current-export')
})

for (const [name, options] of [['signed-out', { owner: null }], ['demo', { demo: true }], ['unconfigured', { configured: false }],
  ['offline', { online: false }], ['loading', { snapshotResult: () => new Promise(() => {}) }]]) {
  test(`${name} vault keeps request controls disabled and dispatches nothing`, async () => {
    const f = fixture(options); await f.flush()
    for (const name of ['Unlock and request export', 'Unlock and create deletion request']) {
      const button = f.button(name); assert.equal(button.props.disabled, true); button.props.onClick()
    }
    await f.flush()
    assert.deepEqual(f.calls.exports, []); assert.deepEqual(f.calls.deletions, [])
  })
}

test('a populated private vault retains its authorized export path', async () => {
  const f = fixture({ sources: [{ id: 'synthetic-source' }] }); await f.flush()
  assert.equal(f.tree.props['data-passport-source'], 'private')
  await f.click('Unlock and request export')
  assert.equal(f.calls.exports.length, 1)
})

test('offline transition disables empty-owner actions and stops downloads', async () => {
  const f = fixture(); await f.flush()
  const stops = f.calls.stops; f.offline()
  assert.ok(f.calls.stops > stops)
  assert.equal(f.button('Unlock and request export').props.disabled, true)
  assert.equal(f.button('Unlock and create deletion request').props.disabled, true)
})

test('a pending empty-owner export cannot report its old job in the next account', async () => {
  const pending = deferred(), f = fixture(); await f.flush()
  f.state.exportResult = () => pending.promise
  await f.click('Unlock and request export')
  assert.equal(f.calls.exports.length, 1)
  f.updateOwner({ uid: 'synthetic-next-owner' }); await f.flush()
  pending.resolve({ jobId: 'synthetic-stale-private-job' }); await f.flush()
  assert.doesNotMatch(text(f.tree), /synthetic-stale/)
  f.unmount()
})
