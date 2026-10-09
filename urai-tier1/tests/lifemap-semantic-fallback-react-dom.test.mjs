import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React, { act } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { withLifeMapSelectionIdentity } from '../src/spatial/memory/lifeMapSelectionJourney.ts'

// Actual ReactDOM/component with an owned synthetic DOM, router, memory-source
// and locale boundary. This proves navigation/commit behavior, never browser
// geometry, Firebase authority, rendered pixels or physical-device acceptance.
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

const originalMatches = DomElement.prototype.matches
DomElement.prototype.matches = function(selector) {
  if (selector.includes(',')) return selector.split(',').some(part => this.matches(part))
  return originalMatches.call(this, selector)
}
DomElement.prototype.closest = function(selector) {
  for (let node = this; node?.nodeType === 1; node = node.parentNode) if (node.matches(selector)) return node
  return null
}
const node = (id, title = id) => ({ id, title, type: 'memory', summary: 'Explicit synthetic recollection', subtitle: '',
  dateLabel: 'Synthetic date', tags: [], connectedTo: [], eraId: 'synthetic-era', replayAvailable: true, locked: false })
const messages = { 'common.search': 'Search', 'common.close': 'Close', 'common.overview': 'Overview',
  'lifeMap.enterFocus': 'Enter Focus', 'nav.replay': 'Replay' }

function fixture(t, { semanticOnly = true, owner = 'owner-one', search = '?memoryId=first&node=first&manifestId=old-manifest',
  nodes = [node('first'), node('second')], sourceMode = 'private' } = {}) {
  const container = document.createElement('div'); document.body.appendChild(container)
  window.location.search = search
  window.history = { state: {}, replaceState(_state, _title, href) { window.location.search = new URL(href, window.location.origin).search } }
  const model = { owner, nodes, sourceMode, props: { semanticOnly, authenticatedUserId: owner } }
  const calls = [], requests = [], root = createRoot(container)
  const router = {
    replace(href) { calls.push(['replace', href]); window.location.search = new URL(href, window.location.origin).search; render() },
    push(href) { calls.push(['push', href]) },
  }
  const locale = { locale: 'en', preference: { requested: 'en', preview: false },
    props: () => ({ lang: 'en', dir: 'ltr' }), formatProps: { lang: 'en' }, date: value => String(value),
    text: key => messages[key] ?? key }
  const imports = {
    react: React, 'react-dom': reactDom, 'react/jsx-runtime': jsxRuntime,
    'next/navigation': { useRouter: () => router, useSearchParams: () => new URLSearchParams(window.location.search) },
    './lifeMapSelection': { requestLifeMapSelection: (...args) => requests.push(args) },
    './useLifeMapEvents': { useLifeMapEvents: uid => ({ nodes: uid === 'demo-user' || uid === model.owner ? model.nodes : [],
      eras: [], loading: false, sourceMode: model.sourceMode }) },
    '@/lib/i18n/useUraiLocale': { useUraiLocale: () => locale },
    '@/lib/i18n/JourneyOfflineNotice': () => null,
    '@/lib/i18n/localePreference': { localizedMessage: (_preference, key) => ({ text: key }) },
    '@/spatial/memory/lifeMapSelectionJourney': { withLifeMapSelectionIdentity },
    './lifeMapSemanticNavigatorOwnership.css': {},
  }
  const filename = new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, window, document, HTMLElement: DomElement, Element: DomElement,
    URL, URLSearchParams, require: name => { assert.ok(name in imports, `unexpected production import ${name}`); return imports[name] } })
  function render() { root.render(React.createElement(module.exports.default, model.props)) }
  act(render)
  t.after(() => { act(() => root.unmount()); document.body.removeChild(container); document.activeElement = document.body })
  const button = label => document.body.querySelectorAll('button').find(element => element.textContent === label)
  return {
    calls, requests, model, button,
    panel: () => document.body.querySelector('#life-map-navigator'),
    trigger: () => document.body.querySelector('[data-testid="life-map-semantic-trigger"]'),
    selected: () => document.body.querySelector('[data-life-map-semantic-only="true"]'),
    click(label) { const target = button(label); assert.ok(target, label); act(() => target.click()) },
    select(id) { const target = document.body.querySelector(`[data-life-map-node-id="${id}"]`); assert.ok(target); act(() => target.click()) },
    key(key) { const event = new DomEvent('keydown', { key, bubbles: true }); act(() => document.activeElement.dispatchEvent(event)); return event },
    demo(nextNodes) { model.nodes = nextNodes; model.sourceMode = 'explicit-demo'; window.location.search = '?demo=1&overview=1'; act(render) },
    owner(value, nextNodes) { model.owner = value; model.nodes = nextNodes; model.props = { ...model.props, authenticatedUserId: value }; act(render) },
  }
}

test('unavailable WebGL opens actual semantic choices and selected actions inside its panel', t => {
  const f = fixture(t)
  assert.ok(f.panel(), 'fallback must expose choices without requiring a hidden canvas control')
  const focus = f.button('Enter Focus'); assert.ok(focus)
  assert.equal(f.panel().contains(focus), true, 'fallback actions must use the panel scroll budget')
  assert.ok(document.activeElement === focus, "selected Focus control must own focus")
})

test('choosing another private memory keeps actions available and drops the previous manifest', t => {
  const f = fixture(t); f.select('second')
  assert.ok(f.panel())
  const selected = new URLSearchParams(window.location.search)
  assert.equal(selected.get('memoryId'), 'second'); assert.equal(selected.get('node'), 'second')
  assert.equal(selected.has('manifestId'), false)
  f.click('Enter Focus')
  const destination = new URL(f.calls.at(-1)[1], window.location.origin)
  assert.equal(destination.pathname, '/focus')
  for (const key of ['memoryId', 'node', 'returnNode']) assert.equal(destination.searchParams.get(key), 'second')
  assert.equal(destination.searchParams.has('manifestId'), false)
  assert.equal(destination.searchParams.get('from'), 'life-map-semantic')
})

test('disclosed sample selection receives its own manifest and retained return identity', t => {
  const f = fixture(t, { search: '?demo=1&overview=1&manifestId=old-manifest&onboarding=1', sourceMode: 'explicit-demo' })
  f.select('second'); f.click('Enter Focus')
  const destination = new URL(f.calls.at(-1)[1], window.location.origin)
  assert.equal(destination.searchParams.get('demo'), '1')
  assert.equal(destination.searchParams.get('onboarding'), '1')
  assert.equal(destination.searchParams.get('returnNode'), 'second')
  assert.ok(destination.searchParams.get('manifestId'))
  assert.notEqual(destination.searchParams.get('manifestId'), 'old-manifest')
})

test('account change removes prior selected actions until the new owner supplies that memory', t => {
  const f = fixture(t); assert.ok(f.button('Enter Focus'))
  f.owner('owner-two', [])
  assert.equal(f.button('Enter Focus'), undefined)
  assert.equal(document.body.querySelector('[data-life-map-node-id="first"]'), null)
  assert.equal(f.calls.length, 0)
})

test('fallback Escape closes without routing and restores its trigger; overview reopens choices', t => {
  const f = fixture(t)
  assert.equal(f.key('Escape').defaultPrevented, true)
  assert.equal(f.panel(), null); assert.ok(document.activeElement === f.trigger(), "Escape must restore the semantic trigger")
  assert.equal(f.calls.length, 0)
  act(() => f.trigger().click()); f.click('Overview')
  assert.ok(f.panel()); assert.equal(f.button('Enter Focus'), undefined)
  assert.equal(new URLSearchParams(window.location.search).get('overview'), '1')
})

test('healthy canvas retains concealed initial panel and existing selection-close behavior', t => {
  const f = fixture(t, { semanticOnly: false })
  assert.equal(f.panel(), null)
  act(() => f.trigger().click()); f.select('second')
  assert.equal(f.panel(), null); assert.equal(f.button('Enter Focus'), undefined)
  assert.equal(new URLSearchParams(window.location.search).get('memoryId'), 'second')
})


test('signed-out fallback leaves disclosure controls clear until explicit sample admission', t => {
  const f = fixture(t, { owner: null, search: '', nodes: [], sourceMode: 'signed-out' })
  assert.equal(f.panel(), null)
  assert.equal(f.button('Enter Focus'), undefined)
  assert.ok(f.trigger())
  f.demo([node('first'), node('second')])
  assert.ok(f.panel())
  f.select('second')
  assert.ok(f.button('Enter Focus'))
})

test('sign-out closes automatic fallback choices and discards previous selected actions', t => {
  const f = fixture(t)
  assert.ok(f.button('Enter Focus'))
  f.owner(null, [])
  assert.equal(f.panel(), null)
  assert.equal(f.button('Enter Focus'), undefined)
})
