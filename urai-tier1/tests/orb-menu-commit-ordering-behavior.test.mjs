import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React, { act } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'

// Mount the actual component in the declared React/ReactDOM engine. The small
// DOM below supplies DOM mutation, native event propagation and focus ownership;
// routing, world state and conversation are explicit boundaries. This measures
// production event/commit ordering, not browser paint, WebGL timing or Firebase.
class DomEvent {
  constructor(type, init = {}) { this.type = type; this.bubbles = init.bubbles ?? false; this.cancelable = true; this.defaultPrevented = false; Object.assign(this, init) }
  preventDefault() { this.defaultPrevented = true }
  stopPropagation() { this.stopped = true }
}
class DomNode {
  constructor(type, name, document) { this.nodeType = type; this.nodeName = name; this.ownerDocument = document; this.parentNode = null; this.childNodes = []; this.listeners = new Map() }
  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) { node.parentNode?.removeChild(node); const index = before ? this.childNodes.indexOf(before) : this.childNodes.length; assert.ok(index >= 0); this.childNodes.splice(index, 0, node); node.parentNode = this; return node }
  removeChild(node) { const index = this.childNodes.indexOf(node); assert.ok(index >= 0); this.childNodes.splice(index, 1); node.parentNode = null; return node }
  get firstChild() { return this.childNodes[0] ?? null }
  get lastChild() { return this.childNodes.at(-1) ?? null }
  get nextSibling() { const siblings = this.parentNode?.childNodes ?? []; return siblings[siblings.indexOf(this) + 1] ?? null }
  get isConnected() { return this.nodeType === 9 || Boolean(this.parentNode?.isConnected) }
  contains(node) { return node === this || this.childNodes.some(child => child.contains(node)) }
  get textContent() { return this.nodeType === 3 ? this.nodeValue : this.childNodes.map(child => child.textContent).join('') }
  set textContent(value) { for (const child of this.childNodes) child.parentNode = null; this.childNodes = []; if (value !== '') this.appendChild(this.ownerDocument.createTextNode(String(value))) }
  addEventListener(type, callback, options = false) { const entries = this.listeners.get(type) ?? []; entries.push({ callback, capture: options === true || options?.capture === true }); this.listeners.set(type, entries) }
  removeEventListener(type, callback, options = false) { const capture = options === true || options?.capture === true; this.listeners.set(type, (this.listeners.get(type) ?? []).filter(entry => entry.callback !== callback || entry.capture !== capture)) }
  dispatchEvent(event) {
    event.target = this
    const path = []
    for (let node = this; node; node = node.parentNode) path.push(node)
    const browser = this.nodeType === 9 ? this.defaultView : this.ownerDocument?.defaultView
    if (browser && !path.includes(browser)) path.push(browser)
    const invoke = (node, capture) => {
      event.currentTarget = node
      for (const entry of [...(node.listeners.get(event.type) ?? [])]) {
        if (entry.capture === capture) entry.callback.call(node, event)
        if (event.stopped) break
      }
    }
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
  get disabled() { return this.hasAttribute('disabled') }
  get id() { return this.getAttribute('id') ?? '' }
  matches(selector) {
    const notDisabled = selector.endsWith(':not([disabled])')
    if (notDisabled) selector = selector.slice(0, -':not([disabled])'.length)
    if (notDisabled && this.disabled) return false
    const match = selector.match(/^([a-z-]+)?(?:\[([^=\]]+)(?:="([^"]*)")?\])?$/i)
    if (selector.startsWith('#')) return this.id === selector.slice(1)
    assert.ok(match, `DOM adapter needs an explicit selector: ${selector}`)
    return (!match[1] || this.tagName.toLowerCase() === match[1].toLowerCase())
      && (!match[2] || (match[3] === undefined ? this.hasAttribute(match[2]) : this.getAttribute(match[2]) === match[3]))
  }
  querySelectorAll(selector) { return this.childNodes.flatMap(child => child.nodeType === 1 ? [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)] : []) }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null }
  focus() { for (let node = this; node?.nodeType === 1; node = node.parentNode) if (node.disabled || node.hasAttribute('inert')) return; this.ownerDocument.activeElement = this }
  click() { if (!this.disabled) this.dispatchEvent(new DomEvent('click', { bubbles: true, button: 0 })) }
}
class DomDocument extends DomNode {
  constructor() { super(9, '#document', null); this.ownerDocument = this; this.documentElement = this.createElement('html'); this.appendChild(this.documentElement); this.body = this.createElement('body'); this.documentElement.appendChild(this.body); this.activeElement = this.body }
  createElement(tag) { return new DomElement(tag, this) }
  createElementNS(_namespace, tag) { return this.createElement(tag) }
  createTextNode(value) { const text = new DomNode(3, '#text', this); text.nodeValue = String(value); return text }
  querySelector(selector) { return this.documentElement.querySelector(selector) }
}
const document = new DomDocument()
const window = new DomNode(0, 'window', document)
Object.assign(window, { document, HTMLElement: DomElement, HTMLIFrameElement: class {}, location: { origin: 'https://synthetic.invalid', search: '' } })
document.defaultView = window
Object.assign(globalThis, { document, window, HTMLElement: DomElement, IS_REACT_ACT_ENVIRONMENT: true })
const reactDom = await import('react-dom')
const { createRoot } = await import('react-dom/client')

function compile(relative, imports = {}) {
  const filename = new URL(relative, import.meta.url)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, window, document, HTMLElement: DomElement,
    Event: DomEvent, CustomEvent: DomEvent, URL, URLSearchParams,
    sessionStorage: { getItem: () => null },
    require(name) { assert.ok(name in imports, `Unexpected actual production import: ${name}`); return imports[name] },
  }, { filename: filename.pathname })
  return module.exports
}
const registry = compile('../src/spatial/world/destinationRegistry.ts')
const sensory = compile('../src/app/home/orbStateController.ts')
const worldEvents = compile('../src/spatial/world/worldEvents.ts', { '../store/useSceneStore': { useSceneStore: { getState: () => ({ phase: 'HOME' }) } } })

function fixture(t, { destination = 'home', phase = 'idle', search = '', context = {} } = {}) {
  const container = document.createElement('div')
  const trigger = document.createElement('button')
  trigger.setAttribute('data-testid', 'home-semantic-orb')
  trigger.addEventListener('click', worldEvents.requestUraiWorldOrbOpen)
  document.body.appendChild(trigger); document.body.appendChild(container)
  window.location.search = search
  const model = { world: { destination, ...context }, phase }
  const observations = [], calls = [], warnings = []
  const snapshot = () => ({
    open: container.querySelector('[data-urai-audit-action="orb-controls"]')?.getAttribute('aria-expanded'),
    hidden: container.querySelector('#urai-world-companion-menu')?.getAttribute('aria-hidden'),
    inert: container.querySelector('#urai-world-companion-menu')?.hasAttribute('inert'),
    focused: document.activeElement?.getAttribute('data-world-target') ?? document.activeElement?.getAttribute('data-testid') ?? null,
  })
  const observe = event => observations.push({ state: event.detail.state, source: event.detail.source, ...snapshot() })
  window.addEventListener(sensory.URAI_ORB_STATE_EVENT, observe)
  const record = (kind, value) => calls.push({ kind, value, ...snapshot() })
  const originalError = console.error
  console.error = (...args) => { warnings.push(args.map(String).join(' ')); originalError(...args) }
  const actual = compile('../src/spatial/world/PersistentWorldCompanion.tsx', {
    react: React, 'react-dom': reactDom, 'react/jsx-runtime': jsxRuntime,
    'next/navigation': { useRouter: () => ({ push: value => record('push', value) }) },
    '@/app/home/orbStateController': sensory,
    '@/spatial/orb/OrbConversationPanel': ({ active }) => React.createElement('div', { 'data-synthetic-conversation-active': String(active) }),
    './destinationRegistry': registry,
    './worldEvents': { ...worldEvents, requestUraiWorldTravel: value => record('travel', value), requestUraiWorldReturn: () => record('return', null) },
    './WorldStateProvider': { useUraiWorldState: () => model },
  })
  const root = createRoot(container)
  act(() => root.render(React.createElement(actual.PersistentWorldCompanion)))
  observations.length = 0
  let mounted = true
  const unmount = () => { if (mounted) { act(() => root.unmount()); mounted = false } }
  t.after(() => { unmount(); window.removeEventListener(sensory.URAI_ORB_STATE_EVENT, observe); document.body.removeChild(container); document.body.removeChild(trigger); document.activeElement = document.body; console.error = originalError })
  return {
    container, trigger, model, observations, calls, warnings, snapshot,
    controller: () => container.querySelector('[data-urai-audit-action="orb-controls"]'),
    first: () => container.querySelector('#urai-world-companion-menu').querySelector('button:not([disabled])'),
    open() { trigger.focus(); act(() => worldEvents.requestUraiWorldOrbOpen()) },
    key(target, key, afterKeyDown) {
      const event = new DomEvent('keydown', { key, code: key === ' ' ? 'Space' : key, bubbles: true })
      // Native buttons activate Enter on keydown and Space on keyup. The DOM
      // adapter supplies only that browser default; production owns onClick.
      act(() => { target.dispatchEvent(event); if (!event.defaultPrevented && key === 'Enter') target.click() })
      afterKeyDown?.(event)
      const release = new DomEvent('keyup', { key, code: event.code, bubbles: true })
      act(() => {
        const releaseTarget = document.activeElement ?? target
        releaseTarget.dispatchEvent(release)
        if (!event.defaultPrevented && !release.defaultPrevented && key === ' ' && releaseTarget === target) target.click()
      })
      event.release = release
      return event
    },
    phase(value) { model.phase = value; act(() => root.render(React.createElement(actual.PersistentWorldCompanion))) },
    unmount,
  }
}

test('native Home open publishes attention only after actual menu DOM and first focus commit', t => {
  const f = fixture(t)
  assert.equal(f.controller().disabled, false)
  assert.equal(f.container.firstChild.getAttribute('data-hydrated'), 'true')
  f.trigger.focus()
  f.key(f.trigger, 'Enter')
  assert.deepEqual(f.observations, [{ state: 'attention', source: 'companion', open: 'true', hidden: 'false', inert: false, focused: 'home' }])
  assert.equal(document.activeElement, f.first())
})

for (const key of ['Enter', ' ']) {
  test(`actual controller ${JSON.stringify(key)} opens and closes once before external Orb updates`, t => {
    const f = fixture(t)
    f.controller().focus()
    const press = f.key(f.controller(), key, event => {
      assert.equal(event.defaultPrevented, false)
      assert.equal(f.observations.length, key === 'Enter' ? 1 : 0)
    })
    assert.equal(press.defaultPrevented, false)
    assert.equal(press.release.defaultPrevented, false)
    assert.equal(f.observations.length, 1)
    assert.deepEqual(f.observations[0], { state: 'attention', source: 'companion', open: 'true', hidden: 'false', inert: false, focused: 'home' })
    f.controller().focus()
    f.key(f.controller(), key, event => {
      assert.equal(event.defaultPrevented, false)
      assert.equal(f.observations.length, key === 'Enter' ? 2 : 1)
    })
    assert.equal(f.observations.length, 2)
    assert.deepEqual(f.observations[1], { state: 'idle', source: 'companion', open: 'false', hidden: 'true', inert: true, focused: 'home-semantic-orb' })
  })
}

test('Escape closes and restores the exact external trigger before publishing idle', t => {
  const f = fixture(t)
  f.open()
  f.observations.length = 0
  assert.equal(f.key(f.first(), 'ArrowRight').defaultPrevented, false)
  assert.equal(f.observations.length, 0)
  assert.equal(f.key(f.first(), 'Escape').defaultPrevented, true)
  assert.deepEqual(f.observations, [{ state: 'idle', source: 'companion', open: 'false', hidden: 'true', inert: true, focused: 'home-semantic-orb' }])
  assert.equal(document.activeElement, f.trigger)
})

test('pointer toggle commits actual close and external focus before idle', t => {
  const f = fixture(t)
  f.open()
  f.observations.length = 0
  act(() => f.controller().click())
  assert.deepEqual(f.observations, [{ state: 'idle', source: 'companion', open: 'false', hidden: 'true', inert: true, focused: 'home-semantic-orb' }])
})

test('phase-driven close preserves disabled guards and never flushes inside a lifecycle', t => {
  const f = fixture(t)
  f.open()
  f.phase('departing')
  assert.equal(f.snapshot().open, 'false')
  assert.equal(f.snapshot().inert, true)
  assert.equal(f.controller().disabled, true)
  assert.equal(f.container.querySelectorAll('button').filter(button => button.hasAttribute('data-active')).every(button => button.disabled), true)
  assert.equal(f.warnings.some(message => /flushSync|lifecycle|already rendering/.test(message)), false)
  f.phase('idle')
  assert.equal(f.controller().disabled, false)
  assert.equal(f.snapshot().open, 'false')
})

test('travel commits close without restoring trigger and retains actual context and route construction', t => {
  const context = { memoryId: 'synthetic-memory', threadId: 'synthetic-thread', replayManifestId: 'synthetic-manifest', privacyMode: 'private' }
  const f = fixture(t, { context, search: '?placeId=synthetic-place&chapterId=synthetic-chapter' })
  f.open()
  f.observations.length = 0
  act(() => f.container.querySelector('[data-world-target="life-map"]').click())
  assert.equal(f.observations.at(-1).state, 'transition')
  assert.equal(f.observations.every(item => item.open === 'false' && item.hidden === 'true' && item.inert), true)
  assert.notEqual(document.activeElement, f.trigger)
  assert.deepEqual(f.calls.map(call => call.kind), ['push', 'travel'])
  assert.equal(f.calls.every(call => call.open === 'false' && call.hidden === 'true' && call.inert), true)
  const href = new URL(f.calls[0].value, window.location.origin)
  assert.equal(href.pathname, '/life-map')
  for (const [key, value] of Object.entries({ memoryId: context.memoryId, node: context.memoryId, thread: context.threadId, manifestId: context.replayManifestId, privacyMode: context.privacyMode, placeId: 'synthetic-place', chapterId: 'synthetic-chapter' })) assert.equal(href.searchParams.get(key), value)
  assert.equal(href.searchParams.get('entryPortal'), registry.definitionForDestination('life-map').entryPortal)
  assert.equal(href.searchParams.get('cameraCheckpoint'), registry.definitionForDestination('life-map').cameraCheckpoint)
  assert.equal(f.calls[1].value.href, f.calls[0].value)
})

test('world return commits close without fabricating a Home return destination', t => {
  const f = fixture(t, { destination: 'focus' })
  f.open()
  f.observations.length = 0
  act(() => f.container.querySelector('[data-return="true"]').click())
  assert.deepEqual(f.calls.map(call => call.kind), ['return'])
  assert.equal(f.calls[0].open, 'false')
  assert.equal(f.calls[0].inert, true)
  assert.notEqual(document.activeElement, f.trigger)
  assert.equal(f.observations.at(-1).state, 'transition')
})

test('selecting the current destination closes before idle and never starts travel', t => {
  const f = fixture(t)
  f.open()
  f.observations.length = 0
  act(() => f.first().click())
  assert.deepEqual(f.observations, [{ state: 'idle', source: 'companion', open: 'false', hidden: 'true', inert: true, focused: 'home-semantic-orb' }])
  assert.equal(f.calls.length, 0)
})

test('audio consent and unverified public estate remain unchanged by the menu commit repair', t => {
  const f = fixture(t)
  const audio = []
  const observe = event => audio.push([event.type, { ...event.detail }])
  for (const name of ['urai:audio-consent', 'urai:audio-mute']) window.addEventListener(name, observe)
  t.after(() => { for (const name of ['urai:audio-consent', 'urai:audio-mute']) window.removeEventListener(name, observe) })
  f.open()
  const button = f.container.querySelector('[data-world-target="spatial-audio-toggle"]')
  assert.equal(button.getAttribute('aria-pressed'), 'false')
  act(() => button.click())
  assert.deepEqual(audio, [['urai:audio-consent', { enabled: true }], ['urai:audio-mute', { muted: false }]])
  assert.equal(button.getAttribute('aria-pressed'), 'true')
  assert.equal(f.container.querySelectorAll('[data-estate-status="verification-pending"]').length, 4)
  assert.equal(f.container.querySelectorAll('a').length, 0)
  assert.equal(f.container.querySelector('[data-synthetic-conversation-active="true"]') !== null, true)
})

test('unmount removes actual native open and Escape handlers', t => {
  const f = fixture(t)
  f.open()
  f.unmount()
  const before = f.observations.length
  act(() => { worldEvents.requestUraiWorldOrbOpen(); window.dispatchEvent(new DomEvent('keydown', { key: 'Escape' })) })
  assert.equal(f.observations.length, before)
  assert.equal((window.listeners.get(worldEvents.URAI_WORLD_ORB_OPEN_EVENT) ?? []).length, 0)
  assert.equal((window.listeners.get('keydown') ?? []).length, 0)
})
