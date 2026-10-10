import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'
import * as cameraMotion from '../src/spatial/canon/cameraMotion.ts'
import * as lifeMapCameraFrame from '../src/components/lifemap/lifeMapCameraFrame.ts'

// Execute the actual scene and canonical threshold with explicit synthetic
// hook/router/Auth/WebGL adapters. This is component proof, not browser,
// Firebase, private-memory, physical-device, or rendered-world acceptance.
const compile = relative => ts.transpileModule(
  fs.readFileSync(new URL(relative, import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
).outputText
const sceneCode = compile('../src/components/lifemap/ComposedLifeMapScene.tsx')
const canonicalCode = compile('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const homeCode = compile('../src/spatial/navigation/homeSkyInteraction.ts')
const homeReturnCode = compile('../src/spatial/navigation/homeReturnCheckpoint.ts')
const locationCode = compile('../src/lib/browserLocationStore.ts')
const worldEventsCode = compile('../src/spatial/world/worldEvents.ts')
const childNodes = node => [node?.props?.children].flat(Infinity)
const nodes = tree => tree && typeof tree === 'object' ? [tree, ...childNodes(tree).flatMap(nodes)] : []
const text = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? childNodes(tree).map(text).join('') : String(tree)

function fixture({ component = 'scene', sourceMode = 'signed-out', pathname = '/life-map',
  search = '', webgl = true, memoryNodes = [] } = {}) {
  let cursor = 0, dirty = true, tree
  const slots = [], queued = [], listeners = new Map()
  const calls = { push: [], replace: [], worldReturn: 0, worldTravel: [] }
  const suspense = Symbol('synthetic-Suspense')
  const params = new URLSearchParams(search)
  const profile = { tier: 'low', pixelRatioMax: 1, reducedMotion: true, documentVisible: true }
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]))
  const react = {
    Suspense: suspense,
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { const next = typeof value === 'function' ? value(slots[i].value) : value; if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true } }] },
    useRef(initial) { const i = cursor++; slots[i] ??= { value: { current: initial } }; return slots[i].value },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { value: factory(), deps }; return slots[i].value },
    useCallback(callback, deps) { return this.useMemo(() => callback, deps) },
    useEffect(effect, deps) { const i = cursor++, old = slots[i]; if (!old || changed(old.deps, deps)) { slots[i] = { deps, cleanup: old?.cleanup }; queued.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect() }) } },
  }
  // React exports hooks as standalone functions; avoid a fixture-only receiver.
  react.useCallback = (callback, deps) => react.useMemo(() => callback, deps)
  react.useLayoutEffect = react.useEffect
  const browser = {
    location: { origin: 'https://synthetic.invalid', pathname, search, hash: '' },
    history: {
      pushState(_state, _title, href) { const next = new URL(href, browser.location.origin); Object.assign(browser.location, { pathname: next.pathname, search: next.search, hash: next.hash }) },
      replaceState(_state, _title, href) { const next = new URL(href, browser.location.origin); Object.assign(browser.location, { pathname: next.pathname, search: next.search, hash: next.hash }) },
    },
    addEventListener(name, callback) { const group = listeners.get(name) ?? new Set(); group.add(callback); listeners.set(name, group) },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback) },
    dispatchEvent(event) { for (const callback of [...listeners.get(event.type) ?? []]) callback(event) },
    setTimeout() { throw new Error('Unexpected component timer in this settled synthetic fixture') },
    clearTimeout() {},
  }
  class ElementAdapter { constructor(editable = false) { this.editable = editable } matches() { return this.editable } }
  const jsx = (type, props) => ({ type, props })
  const homeModule = { exports: {} }
  vm.runInNewContext(homeCode, { module: homeModule, exports: homeModule.exports, URL, URLSearchParams }, { filename: 'actual-homeSkyInteraction.ts' })
  const homeReturnModule = { exports: {} }
  vm.runInNewContext(homeReturnCode, { module: homeReturnModule, exports: homeReturnModule.exports, window: browser, URLSearchParams }, { filename: 'actual-homeReturnCheckpoint.ts' })
  const locationModule = { exports: {} }
  vm.runInNewContext(locationCode, { module: locationModule, exports: locationModule.exports, window: browser }, { filename: 'actual-browserLocationStore.ts' })
  const worldEventsModule = { exports: {} }
  vm.runInNewContext(worldEventsCode, {
    module: worldEventsModule, exports: worldEventsModule.exports, window: browser, URL, URLSearchParams,
    require(name) { assert.equal(name, '../store/useSceneStore'); return { useSceneStore: { getState: () => ({}) } } },
  }, { filename: 'actual-worldEvents.ts' })
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('synthetic-Fragment') },
    'next/navigation': { useRouter: () => ({ push: value => calls.push.push(value), replace: value => calls.replace.push(value) }), useSearchParams: () => params },
    '@react-three/fiber': { Canvas: 'synthetic-Canvas' }, three: THREE,
    '@/spatial/performance/useAdaptiveSpatialQuality': { useAdaptiveSpatialQuality: () => profile },
    '@/spatial/navigation/homeSkyInteraction': homeModule.exports,
    '@/spatial/navigation/homeReturnCheckpoint': homeReturnModule.exports,
    '@/lib/browserLocationStore': locationModule.exports,
    '@/spatial/canon/cameraMotion': cameraMotion,
    './lifeMapCameraFrame': lifeMapCameraFrame,
    './useLifeMapEvents': { useLifeMapEvents: () => ({ nodes: memoryNodes, loading: false, sourceMode }) },
    './LifeMapProductionWorld': { LifeMapProductionWorld: 'synthetic-production-world-boundary' },
    './lifeMapVisualSystem': { artifactFamilyLabel: () => 'Visual memory', resolveArtifactFamily: () => 'visual' },
    'firebase/auth': { getAuth: () => ({}), onAuthStateChanged: (_auth, callback) => { callback(null); return () => {} } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/spatial/assets/uraiAssets': { assetCssStack: () => '', lifeMapAssets: { primary: { src: 'synthetic-primary' }, mobile: { src: 'synthetic-mobile' } } },
    '@/spatial/adam/AdamLauncherSlot': 'synthetic-founder-slot',
    '@/components/lifemap/LifeMapRouteBoundary': 'synthetic-scene-boundary',
    '@/components/lifemap/LifeMapSemanticNavigator': 'synthetic-semantic-boundary',
    '@/spatial/world/worldEvents': { ...worldEventsModule.exports, requestUraiWorldReturn: () => calls.worldReturn++, requestUraiWorldTravel: request => calls.worldTravel.push(request) },
  }
  const module = { exports: {} }
  vm.runInNewContext(component === 'canonical' ? canonicalCode : sceneCode, {
    exports: module.exports, module, URLSearchParams, URL, window: browser, HTMLElement: ElementAdapter,
    document: { body: { style: {} }, querySelector: () => null,
      createElement: () => ({ getContext: () => webgl ? { getExtension: () => null } : null, width: 0, height: 0 }) },
    require: name => { assert.ok(name in imports, `Unexpected actual component import: ${name}`); return imports[name] },
  }, { filename: component === 'canonical' ? 'actual-SpatialLifeMapCanonical.tsx' : 'actual-ComposedLifeMapScene.tsx' })
  function render() {
    for (let i = 0; dirty && i < 30; i++) {
      dirty = false; cursor = 0
      tree = module.exports.default({ authenticatedUserId: sourceMode === 'private' ? 'synthetic-owner' : null })
      if (tree.type === suspense) tree = tree.props.children.type(tree.props.children.props)
      while (queued.length) queued.shift()()
    }
    assert.equal(dirty, false, 'actual component must settle')
  }
  render()
  return {
    calls, get tree() { return tree },
    canonicalThreshold() { const threshold = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === 'SignedOutLifeMap'); assert.ok(threshold); return threshold.type(threshold.props) },
    changeWebGLState(state) { const bridge = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === 'WebGLRecoveryBridge'); assert.ok(bridge); bridge.props.onStateChange(state); render() },
    settleSelectedCamera() { const world = nodes(tree).find(node => node.type === 'synthetic-production-world-boundary'); const rig = world?.props.cameraRig; assert.equal(rig?.type.name, 'CameraRig'); assert.ok(rig.props.selected); rig.props.onSettledChange(rig.props.selected.id); render() },
    finishHomeReturn() { render(); const world = nodes(tree).find(node => node.type === 'synthetic-production-world-boundary'); const rig = world?.props.cameraRig; assert.equal(rig?.type.name, 'CameraRig'); assert.ok(rig.props.homeReturn); assert.equal(tree.props['data-life-map-phase'], 'home-return'); rig.props.onHomeReturnComplete(rig.props.homeReturn); render() },
    async navigate(href) { browser.history.pushState(null, '', href); await Promise.resolve(); render() },
    key({ key = 'Escape', claimed = false, editable = false } = {}) { const event = { key, defaultPrevented: claimed, target: new ElementAdapter(editable), preventDefault() { this.defaultPrevented = true } }; for (const callback of listeners.get('keydown') ?? []) callback(event); render(); return event },
    unmount() { for (const slot of slots) slot.cleanup?.() },
  }
}

function assertHomeTravel(f, demo = false) {
  assert.deepEqual(f.calls.push, [], 'Home return uses the governed travel boundary')
  assert.equal(f.calls.worldTravel.length, 1)
  const request = f.calls.worldTravel[0]
  assert.equal(request.destination, 'home')
  assert.equal(request.entryPortal, 'home-sky')
  assert.equal(request.cameraCheckpoint, 'home-sky-return')
  const href = new URL(request.href, 'https://synthetic.invalid')
  assert.equal(href.pathname, '/home')
  assert.equal(href.searchParams.get('demo'), demo ? '1' : null)
  assert.equal(href.searchParams.get('homeReturn'), 'descent')
  assert.equal(href.searchParams.has('manifestId'), false)
}

test('signed-out scene leaves Home navigation solely to its canonical disclosure', () => {
  const f = fixture()
  assert.equal(f.tree.props['data-life-map-source'], 'signed-out')
  assert.equal(nodes(f.tree).filter(node => node.props?.['data-life-map-overview-home-return'] === 'true').length, 0,
    'a second focusable Home control must not remain underneath the signed-out disclosure and founder launcher')
  assert.equal(nodes(f.tree).filter(node => node.type === 'nav').length, 0)
  f.unmount()
})

for (const sourceMode of ['explicit-demo', 'private', 'empty', 'unavailable', 'error']) {
  test(`${sourceMode} overview retains its actual Home action`, () => {
    const search = sourceMode === 'explicit-demo' ? '?demo=1&manifestId=synthetic-manifest' : '?manifestId=synthetic-manifest'
    const f = fixture({ sourceMode, search })
    const controls = nodes(f.tree).filter(node => node.props?.['data-life-map-overview-home-return'] === 'true')
    assert.equal(controls.length, 1)
    assert.equal(text(controls[0]), 'Return Home')
    controls[0].props.onClick()
    assert.deepEqual(f.calls.worldTravel, [], 'the camera must finish before committing Home navigation')
    f.finishHomeReturn()
    assertHomeTravel(f, sourceMode === 'explicit-demo')
    f.unmount()
  })
}

for (const pathname of ['/life-map', '/unwind']) {
  test(`${pathname} canonical signed-out disclosure retains one 48px Home callback`, () => {
    const f = fixture({ component: 'canonical', pathname })
    const disclosure = nodes(f.tree).find(node => node.props?.['data-testid'] === 'urai-life-map-signed-out-disclosure')
    assert.ok(disclosure)
    assert.equal(f.tree.props['data-private-memory-mounted'], 'false')
    const controls = nodes(disclosure).filter(node => node.type === 'button' && text(node) === 'Return Home')
    assert.equal(controls.length, 1)
    assert.equal(controls[0].props.style.minHeight, 48)
    controls[0].props.onClick()
    assert.deepEqual(f.calls.push, ['/home'])
    f.unmount()
  })
}

test('no-WebGL canonical threshold retains its signed-out Home action', () => {
  const f = fixture({ component: 'canonical', webgl: false })
  const threshold = f.canonicalThreshold()
  assert.equal(threshold.props['data-private-memory-mounted'], 'false')
  const controls = nodes(threshold).filter(node => node.type === 'button' && text(node) === 'Return Home')
  assert.equal(controls.length, 1)
  assert.equal(controls[0].props.style.minHeight, 48)
  controls[0].props.onClick()
  assert.deepEqual(f.calls.push, ['/home'])
  f.unmount()
})

test('signed-out Escape keeps Home navigation and existing claimed/editable-key guards', () => {
  const f = fixture()
  f.key({ claimed: true }); f.key({ editable: true }); f.key({ key: 'Enter' })
  assert.deepEqual(f.calls.push, [])
  assert.equal(f.key().defaultPrevented, true)
  assert.deepEqual(f.calls.worldTravel, [])
  f.finishHomeReturn()
  assertHomeTravel(f)
  f.unmount()
  f.key()
  assert.equal(f.calls.worldTravel.length, 1, 'unmount removes the actual keyboard listener')
})

test('signed-out WebGL recovery keeps its actual Home action and restores the overview', () => {
  const f = fixture()
  f.changeWebGLState('lost')
  const recovery = nodes(f.tree).find(node => node.props?.className === 'life-map-recovery')
  assert.ok(recovery)
  const controls = nodes(recovery).filter(node => node.type === 'button' && text(node) === 'Return Home')
  assert.equal(controls.length, 1)
  controls[0].props.onClick()
  assertHomeTravel(f)
  f.changeWebGLState('ready')
  assert.equal(nodes(f.tree).some(node => node.props?.className === 'life-map-recovery'), false)
  f.unmount()
})

test('selected disclosed memory keeps Focus/Replay identity and its separate Overview action', () => {
  const memory = { id: 'synthetic-memory', title: 'Synthetic selected memory', replayAvailable: true, locked: false, dateLabel: 'Synthetic date' }
  const f = fixture({ sourceMode: 'explicit-demo', search: '?demo=1&manifestId=synthetic-manifest&node=synthetic-memory', memoryNodes: [memory] })
  assert.equal(f.tree.props['data-life-map-mode'], 'selected')
  assert.equal(nodes(f.tree).some(node => node.props?.['data-life-map-overview-home-return'] === 'true'), false)
  let actions = nodes(f.tree).find(node => node.props?.['aria-label'] === 'Selected memory actions')
  assert.ok(actions)
  let focus = nodes(actions).find(node => node.props?.className === 'focus-threshold')
  assert.equal(focus.props.disabled, true, 'camera readiness must guard the actual selected-memory action')
  focus.props.onClick()
  assert.deepEqual(f.calls.push, [], 'an early callback must not bypass camera readiness')
  f.settleSelectedCamera()
  actions = nodes(f.tree).find(node => node.props?.['aria-label'] === 'Selected memory actions')
  focus = nodes(actions).find(node => node.props?.className === 'focus-threshold')
  assert.equal(focus.props.disabled, false)
  focus.props.onClick()
  const destination = new URL(f.calls.push[0], 'https://synthetic.invalid')
  assert.equal(destination.pathname, '/focus')
  for (const key of ['memoryId', 'node', 'returnNode']) assert.equal(destination.searchParams.get(key), memory.id)
  assert.equal(destination.searchParams.get('demo'), '1')
  assert.equal(destination.searchParams.get('manifestId'), 'synthetic-manifest')
  assert.ok(nodes(actions).find(node => node.props?.className === 'replay-threshold'))
  assert.ok(nodes(actions).find(node => node.props?.className === 'overview-return'))
  f.unmount()
})
