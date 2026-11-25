import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import { createManualWeatherSession, MANUAL_WEATHER_RESET_EVENT, notifyManualWeatherRevocation, UNAVAILABLE_MANUAL_WEATHER } from '../src/lib/uraiEmotion/manualWeatherSession.ts'
import { URAI_EMOTIONAL_WEATHER } from '../src/lib/uraiEmotion/weather.ts'

const require = createRequire(import.meta.url)
const root = new URL('../src/', import.meta.url)
function source(path) { return fs.readFileSync(new URL(path, root), 'utf8') }
function compile(path, requireModule, globals = {}) {
  const module = { exports:{} }
  const code = ts.transpileModule(source(path), { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true } }).outputText
  vm.runInNewContext(code, { module, exports:module.exports, ...globals, require:requireModule })
  return module.exports
}
function sessionFixture() {
  const owner = {}, session = createManualWeatherSession()
  let current = true
  session.bind(owner, () => current)
  return { owner, session, lease:session.getLease(), setCurrent:value => { current = value } }
}
function choose(f, weather = 'Calm') {
  assert.equal(f.session.setEnabled(f.session.getLease(), true), true)
  assert.equal(f.session.choose(f.session.getLease(), weather), true)
}

test('an unresolved session is unavailable, disabled, and has no reading', () => {
  const session = createManualWeatherSession()
  assert.equal(session.getSnapshot(), UNAVAILABLE_MANUAL_WEATHER)
  assert.equal(session.getLease(), null)
  assert.equal(session.setEnabled(null, true), false)
  assert.equal(session.choose(null, 'Calm'), false)
})
test('a verified local viewer binding never grants manual consent or inference', () => {
  const f = sessionFixture(), state = f.session.getSnapshot()
  assert.equal(state.ready, true); assert.equal(state.enabled, false)
  assert.equal(state.reading.weather, null); assert.equal(state.reading.source, 'disabled')
  assert.equal(state.inferenceEnabled, false); assert.equal(state.reading.medicalDiagnosis, false)
})
test('enabling alone never invents Calm or another reading', () => {
  const f = sessionFixture(); f.session.setEnabled(f.lease, true)
  assert.equal(f.session.getSnapshot().enabled, true)
  assert.equal(f.session.getSnapshot().reading.weather, null)
  assert.equal(f.session.getSnapshot().reading.source, 'disabled')
})
for (const weather of URAI_EMOTIONAL_WEATHER) test(`explicit user choice ${weather} uses the canonical manual correction kernel`, () => {
  const f = sessionFixture(); choose(f, weather)
  const state = f.session.getSnapshot()
  assert.equal(state.reading.weather, weather); assert.equal(state.reading.source, 'manual')
  assert.equal(state.reading.confidence, 1); assert.equal(state.reading.uncertain, false)
  assert.equal(state.inferenceEnabled, false); assert.equal(state.reading.medicalDiagnosis, false)
  assert.ok(Number.isFinite(state.reading.updatedAt))
})
for (const choice of [null, undefined, '', 'calm', 'diagnosed', 'constructor', '__proto__', '<img src=x onerror=alert(1)>', 1, true, {}, ['Calm']]) test(`invalid manual choice ${String(choice)} cannot produce a reading`, () => {
  const f = sessionFixture(); f.session.setEnabled(f.lease, true)
  assert.equal(f.session.choose(f.lease, choice), false)
  assert.equal(f.session.getSnapshot().reading.weather, null)
})
test('a valid description cannot be selected while explicit manual consent is off', () => {
  const f = sessionFixture(); assert.equal(f.session.choose(f.lease, 'Heavy'), false)
  assert.equal(f.session.getSnapshot().enabled, false)
})
test('foreign viewer and forged revision cannot enable, choose, or reset current preferences', () => {
  const f = sessionFixture(); choose(f, 'Hopeful')
  for (const lease of [{ viewer:{}, revision:f.lease.revision }, { viewer:f.owner, revision:f.lease.revision + 1 }]) {
    assert.equal(f.session.setEnabled(lease, false), false)
    assert.equal(f.session.choose(lease, 'Heavy'), false)
    assert.equal(f.session.reset(lease), false)
  }
  assert.equal(f.session.getSnapshot().reading.weather, 'Hopeful')
})
for (const action of ['off','reset','revoke','end']) test(`${action} erases the chosen state and fences every old handler`, () => {
  const f = sessionFixture(); choose(f, 'Heavy'); const lease = f.session.getLease()
  if (action === 'off') assert.equal(f.session.setEnabled(lease, false), true)
  else if (action === 'reset') assert.equal(f.session.reset(lease), true)
  else f.session[action]()
  assert.equal(f.session.getSnapshot().enabled, false)
  assert.equal(f.session.getSnapshot().reading.weather, null)
  assert.equal(f.session.setEnabled(lease, true), false)
  assert.equal(f.session.choose(lease, 'Energized'), false)
})
test('owner validity is checked on each read and action before observer delivery', () => {
  const f = sessionFixture(); choose(f); const lease = f.session.getLease(); f.setCurrent(false)
  assert.equal(f.session.getSnapshot(), UNAVAILABLE_MANUAL_WEATHER)
  assert.equal(f.session.choose(lease, 'Heavy'), false)
  assert.equal(f.session.setEnabled(lease, true), false)
})
test('a once-invalid owner cannot revive prior choice by becoming current without rebinding', () => {
  const f = sessionFixture(); choose(f); f.setCurrent(false); f.session.getSnapshot(); f.setCurrent(true)
  assert.equal(f.session.getSnapshot(), UNAVAILABLE_MANUAL_WEATHER)
  assert.equal(f.session.setEnabled(f.lease, true), false)
  f.session.bind(f.owner, () => true)
  assert.equal(f.session.getSnapshot().ready, true)
  assert.equal(f.session.getSnapshot().enabled, false)
  assert.equal(f.session.getSnapshot().reading.weather, null)
})
test('a failing owner authority fails closed and cannot be treated as manual consent', () => {
  const session = createManualWeatherSession(); session.bind({}, () => { throw new Error('authority unavailable') })
  assert.equal(session.getSnapshot(), UNAVAILABLE_MANUAL_WEATHER); assert.equal(session.getLease(), null)
})
test('rebinding the same viewer for a successor session clears state and invalidates old revision', () => {
  const f = sessionFixture(); choose(f); const lease = f.session.getLease(); f.session.bind(f.owner, () => true)
  assert.equal(f.session.getSnapshot().reading.weather, null); assert.equal(f.session.getSnapshot().enabled, false)
  assert.equal(f.session.choose(lease, 'Calm'), false)
})
test('two independent provider sessions never share a viewer or preference', () => {
  const a = sessionFixture(), b = sessionFixture(); choose(a, 'Reflective')
  assert.equal(b.session.getSnapshot().reading.weather, null)
  assert.equal(b.session.setEnabled(a.session.getLease(), true), false)
  a.session.revoke(); assert.equal(b.session.getSnapshot().ready, true)
})
test('immutable snapshots prevent a consumer from editing published manual state', () => {
  const f = sessionFixture(), state = f.session.getSnapshot()
  assert.throws(() => { state.enabled = true }, TypeError)
  assert.throws(() => { state.reading.weather = 'Heavy' }, TypeError)
  assert.equal(f.session.getSnapshot().reading.weather, null)
})
test('subscriptions publish actual state changes and unsubscribe cleanly', () => {
  const f = sessionFixture(); let calls = 0
  const unsubscribe = f.session.subscribe(() => calls++)
  choose(f); assert.equal(calls, 2); unsubscribe(); f.session.revoke(); assert.equal(calls, 2)
})

function providerFixture({ configured = true, owner = {uid:'owner-a'}, authThrows = false } = {}) {
  const win = new EventTarget(), auth = { currentUser:owner }, refs = [], effects = [], context = { current:null }
  Object.defineProperty(win,'localStorage',{get:()=>{throw new Error('manual weather must not read or write persistent storage')}})
  Object.defineProperty(win,'sessionStorage',{get:()=>{throw new Error('manual weather must not read or write session storage')}})
  let cursor = 0, initialized = false, onOwner, onError, unsubscribed = 0
  const react = {
    createContext:() => ({ Provider:Symbol('ManualWeatherProvider') }),
    useContext:() => context.current,
    useState:initial => { const index = cursor++; if (!(index in refs)) refs[index] = typeof initial === 'function' ? initial() : initial; return [refs[index], next => { refs[index] = next }] },
    useSyncExternalStore:(_subscribe, getSnapshot) => getSnapshot(),
    useEffect:fn => { if (!initialized) effects.push(fn) },
    useMemo:fn => fn(),
  }
  const module = compile('lib/uraiEmotion/ManualEmotionalWeatherProvider.tsx', id => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return require(id)
    if (id === 'firebase/auth') return { getAuth:() => { if (authThrows) throw new Error('unavailable'); return auth }, onAuthStateChanged:(_auth, next, error) => { onOwner = next; onError = error; return () => { unsubscribed++ } } }
    if (id.includes('firebase/client')) return { app:{}, firebasePublicEnvReady:configured }
    if (id === './manualWeatherSession') return { createManualWeatherSession, MANUAL_WEATHER_RESET_EVENT, UNAVAILABLE_MANUAL_WEATHER }
    return require(id)
  }, { window:win, fetch:()=>{throw new Error('manual weather must not make a network call')} })
  function render() { cursor = 0; const tree = module.default({ children:'existing worlds' }); context.current = tree.props.value; initialized = true; return module.useManualEmotionalWeather() }
  const initial = render(), cleanup = effects[0]()
  return { win, auth, module, initial, render, cleanup, notifyOwner:next => { auth.currentUser = next; onOwner?.(next) }, notifyStaleOwner:next => onOwner?.(next), notifyError:() => onError?.(new Error('auth failed')), getUnsubscribed:() => unsubscribed }
}
function views(p) { return compile('lib/uraiEmotion/ManualEmotionalWeatherControls.tsx', id => {
  if (id === './ManualEmotionalWeatherProvider') return p.module
  if (id === './weather') return { URAI_EMOTIONAL_WEATHER }
  return require(id)
}) }
function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)] }
function event(type, values = {}) { const result = new Event(type); for (const [name,value] of Object.entries(values)) Object.defineProperty(result,name,{value}); return result }

test('actual provider SSR starts with no reading and no enabled controls', () => {
  const p = providerFixture(); assert.equal(p.initial.snapshot.ready, false); assert.equal(p.initial.snapshot.reading.weather, null); p.cleanup()
})
test('actual missing-config viewer can make only an explicit local manual choice', () => {
  const p = providerFixture({ configured:false }); let ui = p.render()
  assert.equal(ui.snapshot.ready, true); assert.equal(ui.snapshot.enabled, false)
  assert.equal(ui.setEnabled(true), true); ui = p.render(); assert.equal(ui.choose('Reflective'), true)
  assert.equal(p.render().snapshot.reading.source, 'manual'); p.cleanup()
})
test('actual auth-ready callback does not enable manual weather by itself', () => {
  const p = providerFixture(); p.notifyOwner(p.auth.currentUser); const ui = p.render()
  assert.equal(ui.snapshot.ready, true); assert.equal(ui.snapshot.enabled, false); assert.equal(ui.snapshot.reading.weather, null); p.cleanup()
})
test('actual auth owner change and same-UID successor cannot inherit previous choice', () => {
  for (const successor of [{uid:'owner-b'}, {uid:'owner-a'}, null]) {
    const p = providerFixture(); p.notifyOwner(p.auth.currentUser); let ui = p.render(); ui.setEnabled(true); ui = p.render(); ui.choose('Heavy'); const stale = p.render()
    p.auth.currentUser = successor
    assert.equal(p.module.useManualEmotionalWeather().snapshot.reading.weather, null)
    assert.equal(stale.choose('Hopeful'), false)
    p.notifyOwner(successor); ui = p.render()
    assert.equal(ui.snapshot.enabled, false); assert.equal(ui.snapshot.reading.weather, null); assert.equal(stale.setEnabled(true), false); p.cleanup()
  }
})
test('actual stale foreign auth callback locks the session instead of granting a viewer', () => {
  const p = providerFixture(); p.notifyOwner(p.auth.currentUser); p.notifyStaleOwner({uid:'foreign'})
  assert.equal(p.render().snapshot.ready, false); assert.equal(p.render().setEnabled(true), false); p.cleanup()
})
for (const failure of ['sdk-error','auth-error']) test(`actual ${failure} removes the manual authority`, () => {
  const p = providerFixture({ authThrows:failure === 'sdk-error' })
  if (failure === 'auth-error') { p.notifyOwner(p.auth.currentUser); let ui = p.render(); ui.setEnabled(true); ui = p.render(); ui.choose('Hopeful'); p.notifyError() }
  assert.equal(p.render().snapshot.ready, false); assert.equal(p.render().snapshot.reading.weather, null); assert.equal(p.render().setEnabled(true), false); p.cleanup()
})
test('actual pagehide ends the session and BFCache resume begins OFF under a new lease', () => {
  const p = providerFixture({ configured:false }); let ui = p.render(); ui.setEnabled(true); ui = p.render(); ui.choose('Calm'); const stale = p.render()
  p.win.dispatchEvent(new Event('pagehide')); assert.equal(p.render().snapshot.reading.weather, null)
  p.win.dispatchEvent(event('pageshow',{persisted:true})); ui = p.render()
  assert.equal(ui.snapshot.ready, true); assert.equal(ui.snapshot.enabled, false); assert.equal(stale.setEnabled(true), false); p.cleanup()
})
test('actual privacy notification clears without carrying private data or granting replacement weather', () => {
  const p = providerFixture({ configured:false }); let ui = p.render(); ui.setEnabled(true); ui = p.render(); ui.choose('Heavy'); const stale = p.render()
  p.win.dispatchEvent(event(MANUAL_WEATHER_RESET_EVENT,{detail:{ownerId:'foreign',state:'Hopeful',enabled:true}}))
  assert.equal(p.render().snapshot.enabled, false); assert.equal(p.render().snapshot.reading.weather, null); assert.equal(stale.choose('Hopeful'), false); p.cleanup()
})
test('historical weather query/event and browser storage cannot grant the actual provider a reading', () => {
  const p = providerFixture({ configured:false })
  p.win.location = {search:'?homeWeather=Heavy&demo=1'}
  p.win.dispatchEvent(event('urai:home-emotional-weather',{detail:{state:'heavy'}}))
  assert.equal(p.render().snapshot.enabled, false); assert.equal(p.render().snapshot.reading.weather, null); p.cleanup()
})
test('actual effect cleanup unsubscribes auth and prevents late callbacks or page events from granting state', () => {
  const p = providerFixture(); p.notifyOwner(p.auth.currentUser); const old = p.render(); p.cleanup()
  assert.equal(p.getUnsubscribed(), 1); p.notifyOwner({uid:'after-cleanup'}); p.win.dispatchEvent(event('pageshow',{persisted:true})); p.win.dispatchEvent(new Event(MANUAL_WEATHER_RESET_EVENT))
  assert.equal(p.render().snapshot.ready, false); assert.equal(old.setEnabled(true), false)
})
test('actual controls start OFF with disabled canonical select and Home status null', () => {
  const p = providerFixture({ configured:false }); p.render(); const v = views(p), tree = v.ManualEmotionalWeatherControls(), all = nodes(tree)
  const checkbox = all.find(node => node.type === 'input'), select = all.find(node => node.type === 'select')
  assert.equal(checkbox.props.checked, false); assert.equal(select.props.disabled, true); assert.equal(select.props.value, '')
  assert.deepEqual(nodes(select).filter(node => node.type === 'option' && node.props.value).map(node => node.props.value), [...URAI_EMOTIONAL_WEATHER])
  assert.equal(v.HomeManualEmotionalWeatherStatus(), null); p.cleanup()
})
test('actual checkbox/select handlers create a manual-only runtime reading and reset erases it', () => {
  const p = providerFixture({ configured:false }); p.render(); const v = views(p)
  nodes(v.ManualEmotionalWeatherControls()).find(node => node.type === 'input').props.onChange({currentTarget:{checked:true}}); p.render()
  assert.equal(v.HomeManualEmotionalWeatherStatus(), null)
  nodes(v.ManualEmotionalWeatherControls()).find(node => node.type === 'select').props.onChange({currentTarget:{value:'Reflective'}}); p.render()
  const status = v.HomeManualEmotionalWeatherStatus(), html = renderToStaticMarkup(status)
  assert.equal(status.props['data-home-emotional-weather'], 'manual'); assert.equal(status.props['data-weather-inference'], 'off')
  assert.match(html, /Manual Emotional Weather: Reflective/); assert.match(html, /Your description for this session/)
  nodes(v.ManualEmotionalWeatherControls()).find(node => node.type === 'button').props.onClick(); p.render()
  assert.equal(v.HomeManualEmotionalWeatherStatus(), null); p.cleanup()
})
test('actual controls reject injected/unknown choice and preserve accessible native semantics', () => {
  const p = providerFixture({ configured:false }); let ui = p.render(); ui.setEnabled(true); p.render(); const v = views(p), tree = v.ManualEmotionalWeatherControls()
  const select = nodes(tree).find(node => node.type === 'select')
  select.props.onChange({currentTarget:{value:'<img src=x onerror=alert(1)>'}}); p.render()
  assert.equal(v.HomeManualEmotionalWeatherStatus(), null)
  const html = renderToStaticMarkup(v.ManualEmotionalWeatherControls())
  assert.match(html, /lang="en" dir="ltr"/); assert.match(html, /aria-labelledby="manual-weather-heading"/); assert.match(html, /role="status" aria-live="polite"/)
  assert.match(html, /min-height:48px/); assert.match(html, /outline:2px solid/); assert.match(html, /overflow-wrap:anywhere/)
  assert.doesNotMatch(html, /<img|onerror=/); p.cleanup()
})
test('actual manual runtime display contains no auth owner identifier or passive signal data',()=>{
  const p=providerFixture({owner:{uid:'private-owner-identity',email:'private@example.test',voiceTone:'private-tone'}})
  p.notifyOwner(p.auth.currentUser);let ui=p.render();ui.setEnabled(true);ui=p.render();ui.choose('Hopeful');p.render()
  const html=renderToStaticMarkup(views(p).HomeManualEmotionalWeatherStatus())
  assert.match(html,/Hopeful/);assert.doesNotMatch(html,/private-owner|private@example|private-tone/);p.cleanup()
})

function privacyFixture(p, { reject = false } = {}) {
  const calls = []
  const module = compile('lib/privacy/operationalPrivacyClient.ts', id => {
    if (id === 'firebase/functions') return {httpsCallable:(_functions,name) => async payload => {calls.push({name,payload,snapshot:p.render().snapshot}); if (reject) throw new Error('provider unavailable'); return {data:{state:'requested'}}}}
    if (id.includes('firebase/client')) return { functions:{}, app:{}, firebasePublicEnvReady:true }
    if (id.includes('manualWeatherSession')) return {notifyManualWeatherRevocation:() => p.win.dispatchEvent(new Event(MANUAL_WEATHER_RESET_EVENT))}
    return {}
  })
  return {module,calls}
}
for (const operation of ['consent','deletion']) for (const reject of [false,true]) test(`actual SDK ${operation} request clears first, even when request ${reject?'fails':'is only queued'}`, async () => {
  const p = providerFixture({ configured:false }); let ui = p.render(); ui.setEnabled(true); ui = p.render(); ui.choose('Heavy'); const old = p.render()
  const f = privacyFixture(p,{reject})
  const call = operation === 'consent' ? f.module.applyOperationalConsentPolicy({domain:'memory',next:{mode:'off'},expectedRevision:12,operationId:'existing-op'}) : f.module.createOperationalDeletionRequest({scope:'all',confirmation:'DELETE',operationId:'existing-op'})
  if (reject) await assert.rejects(call,/unavailable/); else assert.equal((await call).state,'requested')
  assert.equal(f.calls.length,1); assert.equal(f.calls[0].snapshot.enabled,false); assert.equal(f.calls[0].snapshot.reading.weather,null)
  assert.equal(f.calls[0].payload.operationId,'existing-op'); assert.equal(old.choose('Hopeful'),false); assert.equal(p.render().snapshot.reading.weather,null)
  p.cleanup()
})
test('actual clear-only notifier emits no owner, reading, grant, or server result', () => {
  const previous = globalThis.window, win = new EventTarget(); globalThis.window = win
  try {
    let notification; win.addEventListener(MANUAL_WEATHER_RESET_EVENT,event => {notification=event})
    notifyManualWeatherRevocation(); assert.ok(notification); assert.equal(notification.detail,undefined)
  } finally { if(previous === undefined) delete globalThis.window; else globalThis.window = previous }
})
test('clear-only notifier is inert during SSR without a browser', () => {
  const previous = globalThis.window; delete globalThis.window
  try { assert.doesNotThrow(notifyManualWeatherRevocation) } finally { if(previous !== undefined) globalThis.window = previous }
})

test('actual Settings, Home normal/fallback, and RootLayout own the mounted preference/status/provider', () => {
  const Controls = () => null, Status = () => null, Provider = () => null
  function consumer(path,webgl = true) { return compile(path,id => {
    if (id === 'react/jsx-runtime') return require(id)
    if (id === 'react') return {useState:value => [typeof value === 'function'?value():value,()=>{}],useRef:value => ({current:value}),useEffect:()=>{},useMemo:fn => fn(),useCallback:fn => fn,Suspense:Symbol('Suspense')}
    if (id === 'next/navigation') return {usePathname:()=>'/home'}
    if (id.includes('HomeSpatialCanvas')) return {useWebGLAvailable:()=>webgl}
    if (id.includes('useUraiLocale')) return {useUraiLocale:()=>({text:key=>key,props:()=>({lang:'en',dir:'ltr'})})}
    if (id.includes('ManualEmotionalWeatherControls')) return {ManualEmotionalWeatherControls:Controls,HomeManualEmotionalWeatherStatus:Status}
    if (id.includes('ManualEmotionalWeatherProvider')) return {__esModule:true,default:Provider}
    if (id.includes('discoverability')) return {blockedRobotsMetadata:()=>({index:false,follow:false}),BLOCKED_INDEXING_STATE:'blocked'}
    if (id.includes('firebase/client')) return {firebasePublicEnvReady:false,app:{}}
    return {__esModule:true,default:()=>null}
  },{process,window:{location:{search:''}},navigator:{}}) }
  assert.ok(nodes(consumer('app/settings/DeviceSettingsClient.tsx').default()).some(node=>node.type===Controls))
  for (const webgl of [true,false]) assert.ok(nodes(consumer('app/HomeSpatialRuntimeLayer.tsx',webgl).default()).some(node=>node.type===Status))
  assert.ok(nodes(consumer('app/layout.tsx').default({children:'existing worlds'})).some(node=>node.type===Provider))
})
