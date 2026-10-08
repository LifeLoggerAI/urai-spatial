import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const ts = createRequire(import.meta.url)('typescript')
const root = process.env.URAI_REPAIR_SOURCE_ROOT || fileURLToPath(new URL('../..', import.meta.url))
const hookSource = fs.readFileSync(path.join(root, 'urai-tier1/src/spatial/hooks/useReducedMotion.ts'), 'utf8')
const sensorySource = fs.readFileSync(path.join(root, 'urai-tier1/src/spatial/accessibility/SensorySafeRuntime.tsx'), 'utf8')
function harness({ os = false, preference = false, media = true, legacy = false, blockedStorage = false, ssr = false, dataset = false } = {}) {
  let state, cleanup, updates = 0
  const eventListeners = new Map(), mediaListeners = new Set()
  const values = new Map([['urai:sensory-safe:enabled-v1', preference ? 'true' : 'false']])
  const storage = { getItem: (key) => { if (blockedStorage) throw new Error('storage blocked'); return values.get(key) ?? null }, setItem: (key, value) => { if (blockedStorage) throw new Error('storage blocked'); values.set(key, value) } }
  const query = { matches: os }
  if (legacy) { query.addListener = (fn) => mediaListeners.add(fn); query.removeListener = (fn) => mediaListeners.delete(fn) }
  else { query.addEventListener = (_type, fn) => mediaListeners.add(fn); query.removeEventListener = (_type, fn) => mediaListeners.delete(fn) }
  const document = { documentElement: { dataset: { uraiSensorySafe: String(dataset) } } }
  const window = { localStorage: storage, addEventListener: (type, fn) => { if (!eventListeners.has(type)) eventListeners.set(type, new Set()); eventListeners.get(type).add(fn) }, removeEventListener: (type, fn) => eventListeners.get(type)?.delete(fn), dispatchEvent: (event) => { for (const fn of eventListeners.get(event.type) || []) fn(event) } }
  if (media) window.matchMedia = () => query
  const react = { useState: (initial) => { state = initial; return [state, (value) => { state = value; updates++ }] }, useEffect: (fn) => { cleanup = fn() } }
  const context = { document, CustomEvent, ...(ssr ? {} : { window }) }
  const load = (source, require) => { const exports = {}; const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText; vm.runInNewContext(js, { ...context, exports, require }); return exports }
  const sensory = load(sensorySource, (name) => { assert.equal(name, 'react'); return react })
  const hook = load(hookSource, (name) => { if (name === 'react') return react; assert.match(name, /SensorySafeRuntime$/); return sensory })
  hook.useReducedMotion()
  return { get state() { return state }, get updates() { return updates }, query, values, storage, document, sensory, emit: (type, fields = {}) => window.dispatchEvent({ type, ...fields }), setOs: (value) => { query.matches = value; for (const fn of mediaListeners) fn() }, dispose: () => cleanup?.(), listenerCount: () => [...eventListeners.values()].reduce((n, s) => n + s.size, mediaListeners.size) }
}
test('actual hook bootstraps persisted current Low stimulation without an OS preference', () => assert.equal(harness({ preference: true }).state, true))
test('actual hook maintains OS reduction when local control is disabled', () => { const h = harness({ os: true }); h.sensory.setSensorySafeEnabled(false); assert.equal(h.state, true) })
test('actual control event toggles user preference and remains additive with OS', () => { const h = harness(); h.sensory.setSensorySafeEnabled(true); assert.equal(h.state, true); h.setOs(true); h.sensory.setSensorySafeEnabled(false); assert.equal(h.state, true); h.setOs(false); assert.equal(h.state, false) })
test('actual hook supports Low stimulation without matchMedia', () => { const h = harness({ preference: true, media: false }); assert.equal(h.state, true); h.sensory.setSensorySafeEnabled(false); assert.equal(h.state, false) })
test('actual hook responds to matching cross-tab preference and storage clear', () => { const h = harness(); h.values.set('urai:sensory-safe:enabled-v1', 'true'); h.emit('storage', { key: 'urai:sensory-safe:enabled-v1', storageArea: h.storage }); assert.equal(h.state, true); h.values.clear(); h.emit('storage', { key: null, storageArea: h.storage }); assert.equal(h.state, false) })
test('actual hook ignores unrelated keys and a foreign storage area', () => { const h = harness(); h.values.set('urai:sensory-safe:enabled-v1', 'true'); h.emit('storage', { key: 'unrelated', storageArea: h.storage }); assert.equal(h.state, false); h.emit('storage', { key: 'urai:sensory-safe:enabled-v1', storageArea: {} }); assert.equal(h.state, false) })
test('actual current control remains effective when persistence is blocked', () => { const h = harness({ blockedStorage: true }); h.sensory.setSensorySafeEnabled(true); assert.equal(h.state, true); h.sensory.setSensorySafeEnabled(false); assert.equal(h.state, false) })
test('actual hook bootstraps the in-memory current control after a blocked write', () => assert.equal(harness({ blockedStorage: true, dataset: true }).state, true))
test('actual hook handles legacy media-query listeners and OS changes', () => { const h = harness({ legacy: true }); h.setOs(true); assert.equal(h.state, true); h.dispose(); assert.equal(h.listenerCount(), 0) })
test('actual hook removes all listeners and suppresses updates after unmount', () => { const h = harness(); assert.equal(h.listenerCount(), 3); h.dispose(); const before = h.updates; h.sensory.setSensorySafeEnabled(true); h.setOs(true); h.emit('storage', { key: null }); assert.equal(h.updates, before); assert.equal(h.listenerCount(), 0) })
test('actual hook SSR bootstrap does not read browser authority', () => { const h = harness({ ssr: true, preference: true }); assert.equal(h.state, false); assert.equal(h.listenerCount(), 0) })
