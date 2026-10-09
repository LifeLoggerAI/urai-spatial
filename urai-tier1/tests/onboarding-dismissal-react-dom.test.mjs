import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React, { act } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'

// Actual ReactDOM/onboarding component with owned DOM, route and selection
// adapters. Proves native event/commit ordering, not browser paint, GPU timing,
// Firebase authority, source media or physical-device acceptance.
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
  querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector) }
}
const document = new DomDocument()
const window = new DomNode(0, 'window', document)
Object.assign(window, { document, HTMLElement: DomElement, HTMLIFrameElement: class {}, location: { origin: 'https://synthetic.invalid', search: '' } })
document.defaultView = window
Object.assign(globalThis, { document, window, HTMLElement: DomElement, IS_REACT_ACT_ENVIRONMENT: true })
const reactDom = await import('react-dom')
const { createRoot } = await import('react-dom/client')

function mountGuide(t) {
  window.location = new URL('https://synthetic.invalid/?onboarding=1')
  window.requestAnimationFrame = () => 1
  window.cancelAnimationFrame = () => {}
  const writes = []
  const stored = new Map()
  window.localStorage = { getItem: key => stored.get(key) ?? null, setItem(key, value) {
    // Observe the actual committed DOM at the synchronous persistence boundary.
    writes.push({ key, value, visibleGuides: document.querySelectorAll('aside').length })
    stored.set(key, value)
  } }
  const assets = Object.fromEntries(['home', 'ground', 'life-map', 'privacy'].map(name => [`first-run-${name}-card`, { src: `${name}.webp`, alt: name, fallback: 'fallback.webp' }]))
  const imports = { react: React, 'react-dom': reactDom, 'react/jsx-runtime': jsxRuntime,
    'next/navigation': { usePathname: () => window.location.pathname, useSearchParams: () => window.location.searchParams },
    '@/hooks/useBrowserLocation': { useBrowserLocation: () => `${window.location.pathname}${window.location.search}${window.location.hash}` },
    '@/spatial/memory/useSelectedMemory': { useSelectedMemory: () => ({ status: 'unavailable', memory: null }) },
    '@/spatial/assets/uraiV2Assets': { v2Onboarding: assets },
    './onboardingJourney': {}, './UraiCanonicalVersionAssetTemplate': { __esModule: true, default: () => null },
  }
  for (const name of ['v2-ground-states', 'v2-ground-council', 'v2-ground-objects', 'v2-ground-interaction', 'v2-memory-states', 'v2-realm-states', 'v2-accessibility-states', 'v2-state-controller', 'v2-onboarding']) imports[`./${name}.css`] = {}
  imports['./onboardingJourney'].guidedCardHref = href => href
  const source = fs.readFileSync(new URL('../src/app/UraiV2OnboardingLayer.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, window, document, URL, URLSearchParams,
    require: name => { assert.ok(Object.hasOwn(imports, name), `Undeclared onboarding boundary ${name}`); return imports[name] } })
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(React.createElement(module.exports.default)))
  const skip = container.querySelectorAll('button').find(node => node.textContent === 'Skip')
  assert.ok(skip)
  const originalError = console.error
  console.error = (...args) => {
    if (String(args[0]).includes('not wrapped in act')) return
    originalError(...args)
  }
  t.after(() => { act(() => root.unmount()); document.body.removeChild(container); console.error = originalError })
  return { skip, container, writes, stored }
}

test('native Skip commits dismissal before the completion-storage observer can react', t => {
  const guide = mountGuide(t)
  assert.equal(guide.container.querySelectorAll('aside').length, 1)
  act(() => guide.skip.click())
  assert.deepEqual(guide.writes, [{ key: 'urai:onboarding:v2:complete', value: '1', visibleGuides: 0 }])
  assert.equal(guide.container.querySelectorAll('aside').length, 0)
  assert.equal(guide.stored.get('urai:onboarding:v2:complete'), '1')
})

