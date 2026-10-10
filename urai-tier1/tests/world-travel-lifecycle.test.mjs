import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import React, { act } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import * as destinations from '../src/spatial/world/destinationRegistry.ts'
import * as worldTypes from '../src/spatial/world/worldTypes.ts'
import * as returnFrame from '../src/spatial/world/worldReturnCameraFrame.ts'

// Mount the real provider, controller and travel boundary in React 19. The DOM
// adapter owns event propagation; the clock and router are explicit boundaries.
// These tests measure cancellation/commit ordering, not WebGL paint or timing.
class HarnessEvent {
  constructor(type, fields = {}) { Object.assign(this, { type, defaultPrevented: false, bubbles: false }, fields) }
  preventDefault() { this.defaultPrevented = true }
  stopPropagation() { this.stopped = true }
}
class DomNode {
  constructor(type, name, document) { Object.assign(this, { nodeType: type, nodeName: name, ownerDocument: document, parentNode: null, childNodes: [], listeners: new Map() }) }
  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) { node.parentNode?.removeChild(node); const index = before ? this.childNodes.indexOf(before) : this.childNodes.length; assert.ok(index >= 0); this.childNodes.splice(index, 0, node); node.parentNode = this; return node }
  removeChild(node) { const index = this.childNodes.indexOf(node); assert.ok(index >= 0); this.childNodes.splice(index, 1); node.parentNode = null; return node }
  get firstChild() { return this.childNodes[0] ?? null }
  get lastChild() { return this.childNodes.at(-1) ?? null }
  get nextSibling() { const siblings = this.parentNode?.childNodes ?? []; return siblings[siblings.indexOf(this) + 1] ?? null }
  get isConnected() { return this.nodeType === 9 || Boolean(this.parentNode?.isConnected) }
  contains(node) { return node === this || this.childNodes.some(child => child.contains(node)) }
  get textContent() { return this.nodeType === 3 ? this.nodeValue : this.childNodes.map(child => child.textContent).join('') }
  set textContent(value) { this.childNodes.forEach(child => { child.parentNode = null }); this.childNodes = []; if (value !== '') this.appendChild(this.ownerDocument.createTextNode(String(value))) }
  addEventListener(type, callback, options = false) { const entries = this.listeners.get(type) ?? []; entries.push({ callback, capture: options === true || options?.capture === true }); this.listeners.set(type, entries) }
  removeEventListener(type, callback, options = false) { const capture = options === true || options?.capture === true; this.listeners.set(type, (this.listeners.get(type) ?? []).filter(entry => entry.callback !== callback || entry.capture !== capture)) }
  dispatchEvent(event) {
    event.target = this
    const path = []
    for (let node = this; node; node = node.parentNode) path.push(node)
    const browser = this.nodeType === 9 ? this.defaultView : this.ownerDocument?.defaultView
    if (browser && !path.includes(browser)) path.push(browser)
    const invoke = (node, capture) => { for (const listener of [...(node.listeners.get(event.type) ?? [])]) if (listener.capture === capture) listener.callback(event) }
    for (const node of [...path].reverse()) { invoke(node, true); if (event.stopped) break }
    if (!event.stopped) for (const node of event.bubbles ? path : [this]) { invoke(node, false); if (event.stopped) break }
    return !event.defaultPrevented
  }
}
class DomElement extends DomNode {
  constructor(tag, document) { super(1, tag.toUpperCase(), document); this.tagName = this.nodeName; this.namespaceURI = 'http://www.w3.org/1999/xhtml'; this.attributes = new Map(); this.style = { setProperty(name, value) { this[name] = value }, removeProperty(name) { delete this[name] } } }
  setAttribute(name, value) { this.attributes.set(name, String(value)) }
  removeAttribute(name) { this.attributes.delete(name) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  hasAttribute(name) { return this.attributes.has(name) }
  matches(selector) { return selector.split(',').some(value => value.trim() === this.tagName.toLowerCase() || (value.trim() === '[role="textbox"]' && this.getAttribute('role') === 'textbox')) }
  focus() { this.ownerDocument.activeElement = this }
}
class DomDocument extends DomNode {
  constructor() { super(9, '#document', null); this.ownerDocument = this; this.documentElement = this.createElement('html'); this.appendChild(this.documentElement); this.body = this.createElement('body'); this.documentElement.appendChild(this.body); this.activeElement = this.body; this.replayReady = true }
  createElement(tag) { return new DomElement(tag, this) }
  createElementNS(_namespace, tag) { return this.createElement(tag) }
  createTextNode(value) { const text = new DomNode(3, '#text', this); text.nodeValue = String(value); return text }
  querySelector(selector) { if (selector === '[data-testid="cinematic-replay-client"]') return this.replayReady ? {} : null; if (selector.includes('passport-ownership-vault')) return {}; return null }
}
const bootstrapDocument = new DomDocument()
const bootstrapWindow = new DomNode(0, 'window', bootstrapDocument)
Object.assign(bootstrapWindow, { document: bootstrapDocument, HTMLElement: DomElement, HTMLIFrameElement: class {} })
bootstrapDocument.defaultView = bootstrapWindow
Object.assign(globalThis, { document: bootstrapDocument, window: bootstrapWindow, HTMLElement: DomElement, IS_REACT_ACT_ENVIRONMENT: true })
const { createRoot } = await import('react-dom/client')

function clock() {
  let now = 10_000; let nextId = 0; const jobs = new Map()
  const schedule = (callback, delay, interval = false) => { const id = ++nextId; jobs.set(id, { callback, at: now + delay, delay, interval }); return id }
  return {
    now: () => now,
    setTimeout: (callback, delay) => schedule(callback, delay),
    setInterval: (callback, delay) => schedule(callback, delay, true),
    clearTimeout: id => jobs.delete(id),
    clearInterval: id => jobs.delete(id),
    get size() { return jobs.size },
    advance(ms) {
      const end = now + ms
      for (let count = 0; count < 10_000; count++) {
        const pending = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!pending) { now = end; return }
        const [id, job] = pending; now = job.at
        if (job.interval) job.at += job.delay
        else jobs.delete(id)
        job.callback()
      }
      throw new Error('Timer lifecycle did not settle')
    },
  }
}

function mount({ url = '/focus?memoryId=one&node=one&manifestId=manifest-one', reduced = false, routerCommits = true, controller = true, storageThrows = false } = {}) {
  const document = new DomDocument(); const window = new DomNode(0, 'window', document); const time = clock()
  document.defaultView = window
  let pathname; let runtime; const routes = []; const hardRoutes = []; let root
  const entries = [url]; let entryIndex = 0
  const commit = href => { const value = new URL(href, 'https://urai.invalid'); pathname = value.pathname; Object.assign(window.location, { pathname, search: value.search, hash: value.hash }) }
  const storage = new Map()
  Object.assign(window, time, {
    document, HTMLElement: DomElement, HTMLIFrameElement: class {},
    matchMedia: () => ({ matches: reduced }),
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem(key, value) { if (storageThrows) throw new Error('Storage is disabled'); storage.set(key, value) } },
    location: { origin: 'https://urai.invalid', assign: href => hardRoutes.push(href), reload: () => hardRoutes.push('reload') },
    history: {
      state: {},
      pushState(_state, _title, href) { entries.splice(entryIndex + 1); entries.push(href); entryIndex += 1; commit(href) },
      replaceState(_state, _title, href) { entries[entryIndex] = href; commit(href) },
    },
  })
  commit(url)
  Object.assign(globalThis, { window, document })
  const compile = (relative, imports) => {
    const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8')
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    vm.runInNewContext(output, {
      module, exports: module.exports, window, document, HTMLElement: DomElement, Event: HarnessEvent, CustomEvent: HarnessEvent, URL, URLSearchParams, console,
      Date: { now: time.now },
      require(name) { assert.ok(name in imports, `Unexpected production dependency ${name}`); return imports[name] },
    })
    return module.exports
  }
  const locationStore = compile('../src/lib/browserLocationStore.ts', {})
  const locationHook = compile('../src/hooks/useBrowserLocation.ts', { react: React, '@/lib/browserLocationStore': locationStore })
  const provider = compile('../src/spatial/world/WorldStateProvider.tsx', { react: React, 'react/jsx-runtime': jsxRuntime, '@/hooks/useBrowserLocation': locationHook, './worldTypes': worldTypes, './destinationRegistry': destinations })
  const events = compile('../src/spatial/world/worldEvents.ts', { '../store/useSceneStore': { useSceneStore: { getState: () => ({ phase: 'HOME' }) } } })
  const Probe = () => { runtime = provider.useUraiWorldState(); return null }
  const app = () => React.createElement(provider.UraiWorldStateProvider, { pathname }, React.createElement(Probe), controller ? React.createElement(transition.WorldTransitionController) : null)
  const router = {
    push(href) { routes.push(['push', href]); if (routerCommits) { window.history.pushState({}, '', href); root.render(app()) } },
    replace(href) { routes.push(['replace', href]); if (routerCommits) { window.history.replaceState({}, '', href); root.render(app()) } },
  }
  const transition = compile('../src/spatial/world/WorldTransitionController.tsx', { react: React, 'react/jsx-runtime': jsxRuntime, 'next/navigation': { useRouter: () => router }, '@/lib/browserLocationStore': locationStore, './destinationRegistry': destinations, './WorldStateProvider': provider, './worldTypes': worldTypes, './worldEvents': events, './worldReturnCameraFrame': returnFrame })
  const container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
  act(() => root.render(app()))
  return {
    get runtime() { return runtime }, get href() { return `${window.location.pathname}${window.location.search}${window.location.hash}` }, get historyEntries() { return [...entries] },
    window, document, time, routes, hardRoutes, events,
    travel(request) { act(() => events.requestUraiWorldTravel(request)) },
    returns(count = 1) { act(() => { for (let index = 0; index < count; index++) events.requestUraiWorldReturn() }) },
    escape(fields = {}) { const event = new HarnessEvent('keydown', { bubbles: true, key: 'Escape', ...fields }); act(() => document.body.dispatchEvent(event)); return event },
    async advance(ms) { await act(async () => { time.advance(ms); await Promise.resolve() }) },
    async navigate(href, { back = false } = {}) { await act(async () => { if (back) { commit(href); window.dispatchEvent(new HarnessEvent('popstate')) } else window.history.pushState({}, '', href); root.render(app()); await Promise.resolve() }) },
    unmount() { act(() => root.unmount()) },
  }
}

test('Escape cancels a pending trip and restores its selected memory and camera', async () => {
  const h = mount({ url: '/focus?memoryId=one&node=one&manifestId=manifest-one&cameraCheckpoint=focus%3Aone' })
  const settled = h.runtime.world
  h.travel({ destination: 'replay', href: '/replay', cameraCheckpoint: 'focus:two', context: { memoryId: 'two', replayManifestId: 'manifest-two' } })
  assert.equal(h.runtime.phase, 'travelling')
  h.escape()
  assert.equal(h.runtime.phase, 'idle')
  assert.equal(h.runtime.world, settled, 'cancellation restores the exact settled snapshot')
  await h.advance(6000)
  assert.deepEqual(h.routes, [])
  assert.deepEqual(h.hardRoutes, [])
  h.unmount()
})

test('repeated Return in one event batch starts exactly one outward step', async () => {
  const h = mount({ url: '/replay?memoryId=one&node=one&manifestId=manifest-one' })
  h.returns(3)
  assert.equal(h.runtime.phase, 'travelling')
  await h.advance(1100)
  assert.equal(h.routes.length, 1)
  assert.equal(new URL(h.routes[0][1], 'https://urai.invalid').pathname, '/focus')
  assert.equal(h.runtime.phase, 'idle')
  assert.equal(h.runtime.world.memoryId, 'one')
  h.returns(3)
  await h.advance(1100)
  assert.equal(h.routes.length, 2)
  assert.equal(new URL(h.routes[1][1], 'https://urai.invalid').pathname, '/life-map')
  assert.equal(h.runtime.world.replayManifestId, 'manifest-one')
  h.unmount()
})

test('held Escape cannot cancel its own unwind or traverse a second realm', async () => {
  const h = mount({ url: '/replay?memoryId=one&node=one' })
  h.escape(); h.escape({ repeat: true }); h.escape({ repeat: true })
  await h.advance(6000)
  assert.equal(h.routes.length, 1)
  assert.equal(h.runtime.world.destination, 'focus')
  h.escape({ repeat: true })
  await h.advance(6000)
  assert.equal(h.routes.length, 1)
  h.unmount()
})

test('Back cancels route handoff and fallback before they can overwrite history', async () => {
  const h = mount()
  h.travel({ destination: 'replay', href: '/replay?memoryId=two', context: { memoryId: 'two' } })
  await h.navigate('/life-map?memoryId=one&node=one&cameraCheckpoint=life-map-arrival%3Aone', { back: true })
  await h.advance(6000)
  assert.deepEqual(h.routes, [])
  assert.deepEqual(h.hardRoutes, [])
  assert.equal(h.runtime.world.destination, 'life-map')
  assert.equal(h.runtime.world.memoryId, 'one')
  assert.equal(h.runtime.world.cameraCheckpoint, 'life-map-arrival:one')
  assert.equal(h.runtime.phase, 'idle')
  h.unmount()
})

test('a newer trip wins over an unavailable older destination and its watchdog', async () => {
  const h = mount({ routerCommits: false })
  h.document.replayReady = false
  h.travel({ destination: 'replay', href: '/replay?memoryId=one' })
  await h.advance(1900)
  h.travel({ destination: 'life-map', href: '/life-map?memoryId=two', context: { memoryId: 'two' } })
  await h.advance(1100)
  assert.equal(h.hardRoutes.length, 0, 'old recovery must not run while newer travel is active')
  await h.navigate('/life-map?memoryId=two&node=two')
  await h.advance(6000)
  assert.deepEqual(h.hardRoutes, [])
  assert.equal(h.runtime.world.memoryId, 'two')
  h.unmount()
})

test('unmount removes every owned route and hard-recovery callback', async () => {
  const h = mount()
  h.travel({ destination: 'replay', href: '/replay?memoryId=two' })
  h.unmount()
  await h.advance(6000)
  assert.deepEqual(h.routes, [])
  assert.deepEqual(h.hardRoutes, [])
  assert.equal(h.time.size, 0)
})

test('URL synchronization clears removed context and restores Back camera checkpoints', async () => {
  const h = mount({ url: '/focus?memoryId=one&node=one&manifestId=manifest-one&demo=1&privacyMode=held-private&cameraCheckpoint=focus%3Aone' })
  assert.equal(h.runtime.world.cameraCheckpoint, 'focus:one')
  await h.navigate('/focus', { back: true })
  assert.equal(h.runtime.world.memoryId, undefined)
  assert.equal(h.runtime.world.replayManifestId, undefined)
  assert.equal(h.runtime.world.demo, false)
  assert.equal(h.runtime.world.privacyMode, 'private')
  assert.equal(h.runtime.world.cameraCheckpoint, 'focus-arrival')
  h.unmount()
})

test('reduced motion keeps one return step and selected identity', async () => {
  const h = mount({ reduced: true, url: '/replay?memoryId=one&node=one&manifestId=manifest-one' })
  h.returns(4)
  await h.advance(259)
  assert.equal(h.routes.length, 0)
  await h.advance(1)
  assert.equal(h.routes.length, 1)
  assert.equal(h.runtime.world.destination, 'focus')
  assert.equal(h.runtime.world.memoryId, 'one')
  assert.equal(h.runtime.phase, 'idle')
  h.unmount()
})

test('unavailable controller still has one bounded hard recovery', async () => {
  const h = mount({ controller: false })
  h.document.replayReady = false
  h.travel({ destination: 'replay', href: '/replay?memoryId=two', context: { replayManifestId: 'manifest-two' } })
  await h.advance(2400)
  assert.equal(h.hardRoutes.length, 1)
  assert.equal(new URL(h.hardRoutes[0], 'https://urai.invalid').searchParams.get('manifestId'), 'manifest-two')
  await h.advance(6000)
  assert.equal(h.hardRoutes.length, 1)
  assert.equal(h.time.size, 0)
  h.unmount()
})

test('optional disabled session storage cannot trap Home in a transition', async () => {
  const h = mount({ url: '/home', storageThrows: true })
  h.travel({ destination: 'life-map', href: '/life-map', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
  await h.advance(1100)
  assert.equal(h.runtime.world.destination, 'life-map')
  assert.equal(h.runtime.phase, 'idle')
  h.unmount()
})

test('Replay return restores the Focus pose and retains its distinct original Life Map pose', async () => {
  const query = new URLSearchParams({
    memoryId: 'one', node: 'star-one', returnNode: 'one', manifestId: 'manifest-one',
    cameraCheckpoint: 'focus:star-one', entryCamera: '1,2,8', entryTarget: '0,0.35,-1.55', entryFov: '52',
    lifeMapCheckpoint: 'life-map-arrival:one', lifeMapCamera: '42,12,31', lifeMapTarget: '39,10,23', lifeMapFov: '48',
  })
  const h = mount({ url: `/replay?${query}` })
  h.returns(3); await h.advance(1100)
  let target = new URL(h.href, 'https://urai.invalid').searchParams
  assert.equal(target.get('cameraCheckpoint'), 'focus-return:star-one')
  assert.equal(target.get('node'), 'star-one')
  assert.equal(target.get('entryCamera'), '1,2,8')
  assert.equal(target.get('entryTarget'), '0,0.35,-1.55')
  assert.equal(target.get('lifeMapCamera'), '42,12,31')
  assert.equal(target.get('returnNode'), 'one')
  h.returns(3); await h.advance(1100)
  target = new URL(h.href, 'https://urai.invalid').searchParams
  assert.equal(target.get('cameraCheckpoint'), 'life-map-return:one')
  assert.equal(target.get('node'), 'one')
  assert.equal(target.get('entryCamera'), '42,12,31')
  assert.equal(target.get('entryTarget'), '39,10,23')
  assert.equal(target.get('entryFov'), '48')
  assert.equal(target.get('memoryId'), 'one')
  assert.equal(target.get('manifestId'), 'manifest-one')
  h.unmount()
})

test('direct Focus return preserves the original galaxy frame without interpreting it as a local pose', async () => {
  const query = new URLSearchParams({ memoryId: 'one', node: 'one', returnNode: 'one', cameraCheckpoint: 'life-map-arrival:one', entryCamera: '42,12,31', entryTarget: '39,10,23', entryFov: '48' })
  const h = mount({ url: `/focus?${query}` })
  h.returns(); await h.advance(1100)
  const target = new URL(h.href, 'https://urai.invalid').searchParams
  assert.equal(target.get('cameraCheckpoint'), 'life-map-return:one')
  assert.equal(target.get('entryCamera'), '42,12,31')
  assert.equal(target.get('entryTarget'), '39,10,23')
  h.unmount()
})

for (const fields of [
  { cameraCheckpoint: 'focus:other' },
  { entryCamera: '1,,8' },
  { entryCamera: 'Infinity,2,8' },
  { entryTarget: '90,0.35,-1.55' },
  { entryFov: '500' },
]) {
  test(`return transport rejects wrong-identity or unbounded Focus frames: ${JSON.stringify(fields)}`, async () => {
    const query = new URLSearchParams({ memoryId: 'one', node: 'one', cameraCheckpoint: 'focus:one', entryCamera: '1,2,8', entryTarget: '0,0.35,-1.55', entryFov: '52', ...fields })
    const h = mount({ url: `/replay?${query}` })
    h.returns(); await h.advance(1100)
    const target = new URL(h.href, 'https://urai.invalid').searchParams
    assert.equal(target.get('cameraCheckpoint'), 'focus-arrival')
    assert.equal(target.has('entryCamera'), false)
    assert.equal(target.has('entryTarget'), false)
    h.unmount()
  })
}

test('Back after an unavailable surface commit prevents both later document recoveries', async () => {
  const h = mount()
  h.document.replayReady = false
  h.travel({ destination: 'replay', href: '/replay?memoryId=two', context: { memoryId: 'two' } })
  await h.advance(1900)
  assert.equal(h.runtime.world.destination, 'replay')
  await h.navigate('/focus?memoryId=one&node=one', { back: true })
  await h.advance(6000)
  assert.equal(h.routes.length, 1)
  assert.deepEqual(h.hardRoutes, [])
  assert.equal(h.runtime.world.destination, 'focus')
  assert.equal(h.runtime.world.memoryId, 'one')
  h.unmount()
})

test('same-path selection change cancels the earlier trip and its fallback', async () => {
  const h = mount()
  h.travel({ destination: 'replay', href: '/replay?memoryId=one' })
  await h.navigate('/focus?memoryId=two&node=two&manifestId=manifest-two')
  await h.advance(6000)
  assert.deepEqual(h.routes, [])
  assert.deepEqual(h.hardRoutes, [])
  assert.equal(h.runtime.world.memoryId, 'two')
  assert.equal(h.runtime.phase, 'idle')
  h.unmount()
})

test('Return cancels unavailable-controller recovery without requiring a mounted owner', async () => {
  const h = mount({ controller: false })
  h.document.replayReady = false
  h.travel({ destination: 'replay', href: '/replay?memoryId=two' })
  h.returns()
  await h.advance(6000)
  assert.deepEqual(h.hardRoutes, [])
  assert.equal(h.time.size, 0)
  h.unmount()
})

test('a new memory cannot inherit the previous selected node in either route path', async () => {
  const h = mount()
  h.travel({ destination: 'replay', href: '/replay?memoryId=two', context: { memoryId: 'two' } })
  await h.advance(1900)
  assert.equal(new URL(h.href, 'https://urai.invalid').searchParams.get('node'), 'two')
  h.unmount()
  const fallback = mount({ controller: false })
  fallback.travel({ destination: 'replay', href: '/replay?memoryId=two', context: { memoryId: 'two' } })
  await fallback.advance(2400)
  assert.equal(new URL(fallback.hardRoutes[0], 'https://urai.invalid').searchParams.get('node'), 'two')
  fallback.unmount()
})

test('a retried request object retains the newer generation recovery', async () => {
  const h = mount({ routerCommits: false })
  const request = { destination: 'replay', href: '/replay?memoryId=two', context: { memoryId: 'two' } }
  h.document.replayReady = false
  h.travel(request); await h.advance(1900)
  h.travel(request); await h.advance(2399)
  assert.deepEqual(h.hardRoutes, [])
  await h.advance(1)
  assert.equal(h.hardRoutes.length, 1, 'only the current retry owns hard recovery')
  h.unmount()
})

test('outward returns preserve adopted identity, ownership and reconstruction context', async () => {
  const context = {
    memoryId: 'one', node: 'one', manifestId: 'manifest-one', thread: 'thread-one', personId: 'person-one',
    placeId: 'place-one', eraId: 'era-one', movieId: 'movie-one', chapterId: 'chapter-one',
    privacyMode: 'held-private', originRealm: 'life-map', returnToken: 'return-one', fidelity: 'partial', demo: '1',
  }
  const h = mount({ url: `/replay?${new URLSearchParams(context)}` })
  for (const destination of ['focus', 'life-map']) {
    h.returns(3); await h.advance(1100)
    assert.equal(h.runtime.world.destination, destination)
    const query = new URL(h.href, 'https://urai.invalid').searchParams
    for (const [key, value] of Object.entries(context)) assert.equal(query.get(key), value, key)
    assert.equal(h.runtime.world.eraId, 'era-one')
    assert.equal(h.runtime.world.truthMode, 'reality')
  }
  h.unmount()
})
