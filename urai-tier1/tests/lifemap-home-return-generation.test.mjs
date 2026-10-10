import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'
import * as locationStore from '../src/lib/browserLocationStore.ts'
import * as homeReturn from '../src/spatial/navigation/homeReturnCheckpoint.ts'
import * as cameraMotion from '../src/spatial/canon/cameraMotion.ts'
import * as cameraFrame from '../src/components/lifemap/lifeMapCameraFrame.ts'
const source = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
const visit = (value, predicate) => {
  if (!value || typeof value !== 'object') return null
  if (predicate(value)) return value
  for (const child of Array.isArray(value) ? value : Object.values(value.props ?? {})) { const found = visit(child, predicate); if (found) return found }
  return null
}
function fixture() {
  const previousWindow = globalThis.window, browser = new EventTarget()
  const location = { origin: 'https://urai.invalid', pathname: '/life-map', search: '?overview=1&demo=1', hash: '' }
  const commit = href => { const u = new URL(href, location.origin); Object.assign(location, { pathname: u.pathname, search: u.search, hash: u.hash }) }
  const history = { pushState(_s, _t, href) { commit(href) }, replaceState(_s, _t, href) { commit(href) } }
  Object.assign(browser, { location, history, setTimeout, clearTimeout }); globalThis.window = browser
  let cursor = 0, tree
  const cells = [], layouts = [], effects = [], routes = []
  const effect = queue => (fn, deps) => { const i = cursor++, old = cells[i]; if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) queue.push(() => { old?.cleanup?.(); cells[i] = { deps, cleanup: fn() } }) }
  const hooks = { useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value }] }, useRef(initial) { const i = cursor++; cells[i] ??= { current: initial }; return cells[i] }, useMemo(fn) { cursor++; return fn() }, useCallback(fn) { cursor++; return fn }, useEffect: effect(effects), useLayoutEffect: effect(layouts) }
  const jsx = (type, props) => ({ type, props }), World = () => null
  const matches = href => { const a = new URL(href, location.origin), b = new URL(`${location.pathname}${location.search}${location.hash}`, location.origin); a.searchParams.sort(); b.searchParams.sort(); return a.pathname === b.pathname && a.search === b.search && a.hash === b.hash }
  const imports = { react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, three: THREE, '@react-three/fiber': { Canvas: () => null },
    'next/navigation': { useSearchParams: () => new URLSearchParams(location.search), useRouter: () => ({ replace: href => history.replaceState({}, '', href), push: href => history.pushState({}, '', href) }) },
    '@/spatial/performance/useAdaptiveSpatialQuality': { useAdaptiveSpatialQuality: () => ({ tier: 'medium', pixelRatioMax: 1, documentVisible: true, reducedMotion: false }) },
    '@/spatial/navigation/homeReturnCheckpoint': homeReturn, '@/lib/browserLocationStore': locationStore,
    './useLifeMapEvents': { useLifeMapEvents: () => ({ nodes: [], loading: false, sourceMode: 'private' }) }, './LifeMapProductionWorld': { LifeMapProductionWorld: World }, './lifeMapVisualSystem': { resolveArtifactFamily: () => 'memory' },
    '@/spatial/canon/cameraMotion': cameraMotion, './lifeMapCameraFrame': cameraFrame,
    '@/spatial/world/worldEvents': { requestUraiWorldTravel: r => routes.push(r), worldTravelLocationMatches: matches } }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: id => { assert.ok(id in imports, `actual production dependency ${id}`); return imports[id] }, window: browser, document: { querySelector: () => null, body: { style: {} } }, HTMLElement: class {}, URLSearchParams, URL, console })
  const render = () => { cursor = 0; tree = module.exports.default({ authenticatedUserId: 'owned-user' }); while (layouts.length) layouts.shift()(); while (effects.length) effects.shift()(); return tree }
  render()
  return { routes, render,
    start() { visit(tree, x => x.props?.['data-life-map-overview-home-return'] === 'true').props.onClick(); render(); return visit(tree, x => x.type === World).props.cameraRig.props },
    selectNode(node) { visit(tree, x => x.type === World).props.onSelect(node) },
    get href() { return `${location.pathname}${location.search}${location.hash}` },
    async navigate(href, back = false) { history.pushState({}, '', href); if (back) browser.dispatchEvent(new Event('popstate')); await Promise.resolve(); render() },
    unmount() { for (const cell of cells) cell?.cleanup?.(); if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow } }
}
for (const [name, href, back] of [['new selected memory', '/life-map?node=new-memory&demo=1', false], ['Back to another overview context', '/life-map?overview=1&era=older&demo=1', true], ['hash navigation', '/life-map?overview=1&demo=1#new-intent', false]]) {
  test(`actual Map completion cannot overwrite ${name}`, async () => { const f = fixture(); try { const props = f.start(); await f.navigate(href, back); props.onHomeReturnComplete(props.homeReturn); assert.equal(f.routes.length, 0, 'stale camera completion pushed Home over a newer location'); assert.equal(f.href, href) } finally { f.unmount() } })
}
test('mesh input is locked during return and one current completion commits once', () => {
  const f = fixture(); try { const props = f.start(), href = f.href; f.selectNode({ id: 'other', eraId: 'era' }); assert.equal(f.href, href); props.onHomeReturnComplete(props.homeReturn); props.onHomeReturnComplete(props.homeReturn); assert.equal(f.routes.length, 1); assert.equal(f.routes[0].destination, 'home') } finally { f.unmount() }
})
test('unmounted Map owner cannot later commit its captured completion', () => { const f = fixture(), props = f.start(); f.unmount(); props.onHomeReturnComplete(props.homeReturn); assert.equal(f.routes.length, 0) })
