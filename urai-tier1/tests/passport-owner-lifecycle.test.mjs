import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function harness(file = 'PassportVaultClient.tsx', search = '') {
  const slots = [], pendingEffects = [], listeners = new Map(), requests = [], subscriptions = [], navigations = []
  const auth = { currentUser: null }
  let cursor = 0, dirty = false, tree, firstTree, authCallback, returned = 0, stagedHomeReturn = 0, userMotion = false
  const react = {
    Suspense: 'suspense',
    useCallback(fn, deps) { return react.useMemo(() => fn, deps) },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }) },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d,j) => d !== slots[i].deps[j])) slots[i] = { value: fn(), deps }; return slots[i].value },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { const value = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true } }] },
    useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((d,j) => d !== old.deps[j])) { slots[i] = { deps, cleanup: old?.cleanup }; pendingEffects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn() }) } },
  }
  const deferred = kind => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); const item = { kind, resolve, reject }; requests.push(item); return promise }
  const bridge = {
    getOperationalPassportSnapshot: () => deferred('snapshot'),
    getGlobalEmotionalFieldConsent: () => deferred('consent'),
    applyGlobalEmotionalFieldConsent: () => deferred('apply-consent'),
    subscribeOperationalUserCollection(collection, uid, rows, error) { const subscription = { collection, uid, rows, error, stopped: false }; subscriptions.push(subscription); return () => { subscription.stopped = true } },
    createOperationalExportRequest: () => deferred('export'),
    createOperationalDeletionRequest: () => deferred('deletion'),
    getOperationalExportDownloadUrl: () => deferred('download'),
    cancelOperationalExportRequest: () => deferred('cancel-export'),
    cancelOperationalDeletionRequest: () => deferred('cancel-deletion'),
  }
  const jsx = (type, props) => ({ type, props })
  const dependencies = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@react-three/fiber': { Canvas: 'canvas' }, '@react-three/drei': { Float: 'float', OrbitControls: 'orbit', RoundedBox: 'box' },
    'firebase/auth': { getAuth: () => auth, onAuthStateChanged(_auth, callback) { authCallback = callback; callback(auth.currentUser); return () => { authCallback = null } } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/lib/privacy/operationalPrivacyClient': bridge,
    './passportModel': { demoPassportSnapshot: () => ({}), redactPassportSnapshot: value => value },
    '@/spatial/world/worldEvents': { requestUraiWorldReturn() { returned++ } },
    '@/spatial/home/homeExperienceState': { stageHomeReturnFrameForHomeNavigation() { stagedHomeReturn++ } },
    '@/spatial/hooks/useReducedMotion': { useReducedMotion: () => userMotion },
    '@/spatial/runtime/probeWebGLSupport': { probeWebGLSupport: () => true },
    './GlobalEmotionalFieldConsentCard': { default: 'consent-card' }, './passport-vault.css': {},
  }
  const exports = {}, navigator = { onLine: true }
  const window = {
    location: { search, assign: url => navigations.push(url) },
    history: { length: 3, back: () => navigations.push('history-back') },
    matchMedia: () => ({ matches: false }), dispatchEvent() {},
    addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key),
  }
  const source = fs.readFileSync(new URL(`../src/app/passport/${file}`, import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, window, navigator, URLSearchParams, CustomEvent: class {}, document: { createElement: () => ({ getContext: () => ({}) }), getElementById: () => ({ focus() {} }) }, require(id) { if (!(id in dependencies)) throw Error(`Unmocked dependency ${id}`); return dependencies[id] } })
  function render() { let attempts=0; do { dirty=false; cursor=0; tree=exports.default(); firstTree ??= tree; while(pendingEffects.length) pendingEffects.shift()(); if(++attempts>20) throw Error('render loop') } while(dirty); return tree }
  function nodes(node) { return Array.isArray(node) ? node.flatMap(value=>nodes(value)) : node && typeof node==='object' ? [node,...nodes(node.props?.children)] : [] }
  render()
  return {
    requests, subscriptions, navigations, render, firstTree,
    text: () => JSON.stringify(tree),
    state: () => tree.props['data-passport-source'],
    auth(uid) { auth.currentUser = uid ? { uid } : null; authCallback(auth.currentUser); render() },
    swapBeforeCallback(uid) { auth.currentUser = uid ? {uid} : null },
    async settle() { for(let i=0;i<5;i++) await Promise.resolve(); render() },
    button(label) { return nodes(tree).find(node => node.type==='button' && node.props.children===label) },
    clickButton(label) { const button = nodes(tree).find(node => node.type==='button' && node.props.children===label); button?.props.onClick?.(); render(); return { returned, stagedHomeReturn } },
    key(key, target={}) { let prevented=false; listeners.get('keydown')({key,target,preventDefault(){prevented=true}}); render(); return {prevented,returned,stagedHomeReturn} },
    setMotion(value) { userMotion=value; render(); return nodes(tree).find(node=>typeof node.type==='function' && node.type.name==='VaultWorld')?.props.reducedMotion },
    offline(value) { navigator.onLine=!value; listeners.get(value?'offline':'online')(); render() },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}
const payload = label => ({ owner: { displayName: label, keyState:'authorized', ownershipStatus:'verified' }, sources:[{id:label}], devices:[], receipts:[] })
async function loadOwner(h, uid) { h.auth(uid); h.requests.filter(r=>r.kind==='snapshot').at(-1).resolve(payload(uid)); await h.settle() }

test('sign-out clears the owner snapshot and all subscription rows', async () => {
  const h=harness(); await loadOwner(h,'owner-a')
  for(const s of h.subscriptions) s.rows([{id:'private-row-a', state:'ready'}])
  h.render(); assert.match(h.text(),/owner-a/)
  h.auth(null)
  assert.equal(h.state(),'signed-out'); assert.doesNotMatch(h.text(),/owner-a|private-row-a/)
  for(const s of h.subscriptions) s.rows([{id:'late-private-row-a',state:'ready'}])
  h.render(); assert.doesNotMatch(h.text(),/late-private-row-a/)
})
test('account change rejects late old-owner snapshots and errors', async () => {
  const h=harness(); h.auth('owner-a'); const old=h.requests.at(-1)
  h.auth('owner-b'); const current=h.requests.at(-1)
  current.resolve(payload('owner-b')); await h.settle()
  old.resolve(payload('owner-a')); await h.settle()
  assert.match(h.text(),/owner-b/); assert.doesNotMatch(h.text(),/owner-a/)
})
test('same-account relogin invalidates the old request generation', async () => {
  const h=harness(); h.auth('owner-a'); const old=h.requests.at(-1)
  h.auth(null); h.auth('owner-a'); const current=h.requests.at(-1)
  current.resolve(payload('fresh-session')); await h.settle()
  old.reject(new Error('stale')); await h.settle()
  assert.equal(h.state(),'private'); assert.match(h.text(),/fresh-session/)
})
test('identity change before the auth callback rejects a late snapshot', async () => {
  const h=harness(); h.auth('owner-a'); const old=h.requests.at(-1)
  h.swapBeforeCallback('owner-b'); old.resolve(payload('owner-a')); await h.settle()
  assert.doesNotMatch(h.text(),/owner-a/)
})
test('successful snapshot is not fetched again merely because loading ended', async () => {
  const h=harness(); await loadOwner(h,'owner-a')
  assert.equal(h.requests.filter(r=>r.kind==='snapshot').length,1)
  h.offline(true); h.offline(false)
  assert.equal(h.requests.filter(r=>r.kind==='snapshot').length,2)
})
test('late secure download cannot navigate after sign-out', async () => {
  const h=harness(); await loadOwner(h,'owner-a')
  h.subscriptions.find(s=>s.collection==='exportJobs').rows([{id:'export-a',state:'ready'}]); h.render()
  const promise=h.button('Secure download').props.onClick()
  h.auth(null); h.requests.find(r=>r.kind==='download').resolve({url:'https://example.invalid/private-export'})
  await promise; await h.settle(); assert.deepEqual(h.navigations,[])
})
test('Escape uses semantic origin return and Home does not hijack editable fields', () => {
  const h=harness()
  assert.equal(h.key('Home',{tagName:'INPUT',isContentEditable:false}).prevented,false)
  const returned=h.key('Escape')
  assert.equal(returned.returned,1); assert.equal(returned.stagedHomeReturn,1); assert.deepEqual(h.navigations,[])
})
test('Passport return button stages the Home frame before routing', () => {
  const h=harness()
  assert.deepEqual(h.clickButton('Return to origin'),{returned:1,stagedHomeReturn:1})
})
test('vault motion responds to the in-app preference', () => {
  const h=harness(); assert.equal(h.setMotion(true),true); assert.equal(h.setMotion(false),false)
})


test('public-good consent resets on account switch before loading the next owner', async () => {
  const h=harness('GlobalEmotionalFieldConsentCard.tsx')
  h.auth('owner-a'); h.requests.at(-1).resolve({mode:'on', contributes:['private-preference-a']}); await h.settle()
  assert.match(h.text(), /private-preference-a/)
  h.auth('owner-b'); assert.doesNotMatch(h.text(), /private-preference-a/)
})

test('late public-good consent response is rejected after Firebase identity changes', async () => {
  const h=harness('GlobalEmotionalFieldConsentCard.tsx')
  h.auth('owner-a'); const pending=h.requests.at(-1)
  h.swapBeforeCallback('owner-b'); pending.resolve({mode:'on', contributes:['late-preference-a']}); await h.settle()
  assert.doesNotMatch(h.text(), /late-preference-a/)
})

test('late consent mutation cannot restore a signed-out owner preference', async () => {
  const h=harness('GlobalEmotionalFieldConsentCard.tsx')
  h.auth('owner-a'); h.requests.at(-1).resolve({mode:'off'}); await h.settle()
  h.button('On').props.onClick()
  const pending=h.requests.at(-1); assert.equal(pending.kind,'apply-consent')
  h.auth(null); pending.resolve({mode:'on', contributes:['revoked-owner-preference']}); await h.settle()
  assert.doesNotMatch(h.text(), /revoked-owner-preference/)
})


test('current owner can still download an authorized export', async () => {
  const h=harness(); await loadOwner(h,'owner-a')
  h.subscriptions.find(s=>s.collection==='exportJobs').rows([{id:'export-a',state:'ready'}]); h.render()
  const promise=h.button('Secure download').props.onClick()
  h.requests.find(r=>r.kind==='download').resolve({url:'https://example.invalid/authorized-export'})
  await promise; assert.deepEqual(h.navigations,['https://example.invalid/authorized-export'])
})

test('current owner can still apply and display public-good consent', async () => {
  const h=harness('GlobalEmotionalFieldConsentCard.tsx')
  h.auth('owner-a'); h.requests.at(-1).resolve({mode:'off'}); await h.settle()
  h.button('On').props.onClick()
  h.requests.at(-1).resolve({mode:'on',contributes:['current-owner-preference']}); await h.settle()
  assert.match(h.text(),/current-owner-preference/)
  assert.equal(h.button('On').props['aria-pressed'],true)
})

test('unmounted vault rejects a pending snapshot', async () => {
  const h=harness(); h.auth('owner-a'); const pending=h.requests.at(-1)
  h.unmount(); pending.resolve(payload('unmounted-private-owner')); await h.settle()
  assert.doesNotMatch(h.text(),/unmounted-private-owner/)
})


test('review query preserves the initial hydration attributes before resolving its synthetic state', () => {
  const h=harness('PassportVaultClient.tsx','?assetReview=1&passportReview=unavailable')
  assert.equal(h.firstTree.props['data-passport-review-state'],'none')
  assert.equal(h.render().props['data-passport-review-state'],'unavailable')
  assert.equal(h.state(),'unavailable')
  assert.doesNotMatch(h.text(), /sample-owner/)
})


test('only explicit demo=1 can mount sample records after hydration', () => {
  for (const search of ['', '?demo=0', '?demo=true']) {
    const h=harness('PassportVaultClient.tsx', search)
    assert.equal(h.firstTree.props['data-passport-source'], 'loading')
    assert.equal(h.state(), 'signed-out')
    assert.doesNotMatch(h.text(), /sample-owner/)
  }
  const demo=harness('PassportVaultClient.tsx', '?demo=1')
  assert.equal(demo.firstTree.props['data-passport-source'], 'loading')
  assert.equal(demo.state(), 'demo')
  assert.match(demo.text(), /sample-owner/)
  assert.equal(demo.subscriptions.length, 0)
  assert.equal(demo.requests.length, 0)
  demo.offline(true)
  assert.match(demo.text(), /Offline\./)
  assert.equal(demo.button('Unlock and request export').props.disabled, true)
  demo.offline(false)
  assert.match(demo.text(), /DEMONSTRATION/)
})
