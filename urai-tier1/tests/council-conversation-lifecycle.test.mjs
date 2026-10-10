import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React, { act } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'

// Actual declared React/ReactDOM rendering with an explicit small DOM adapter.
// Provider promises are synthetic boundaries: these tests make no provider requests.
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
  get options() { return this.querySelectorAll('option') }
  get value() { return this._value ?? '' }
  set value(value) { this._value = String(value) }
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

const componentPath = new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url)
const agents = [
  { id: 'cartographer', name: 'The Cartographer', role: 'cartographer', focus: 'Memory places' },
  { id: 'archivist', name: 'The Archivist', role: 'archivist', focus: 'Memory chronology' },
]
const answer = message => ({ message, caption: message, disclosure: 'Synthetic provider adapter; no external request.', provider: 'openai', model: 'fixture' })
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }

function fixture(t) {
  const requests = []
  // Current-account authority is an explicit stable adapter; this suite checks
  // presence selection and leaves actor-boundary acceptance to its own tests.
  const actor = { generation: 1 }
  const auth = { currentUser: {} }
  class OrbProviderAttemptError extends Error {}
  class OrbProviderAttemptUncertainError extends Error {}
  class CouncilExternalProviderAttemptError extends Error {}
  class CouncilExternalProviderAttemptUncertainError extends Error {}
  const fallback = () => ({ ...answer('Local fallback'), provider: 'fallback' })
  const imports = {
    react: React, 'react/jsx-runtime': jsxRuntime,
    '@/lib/privacy/aiActorBoundary': {
      subscribeAIActor: () => () => {}, getAIActorSnapshot: () => actor,
      getServerAIActorSnapshot: () => actor, isCurrentAIActorSnapshot: value => value === actor,
    },
    'firebase/auth': { getAuth: () => auth, onAuthStateChanged: (_auth, listener) => { listener(auth.currentUser); return () => {} } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/spatial/orb/openaiClient': {
      OrbProviderAttemptError, OrbProviderAttemptUncertainError,
      attemptedExternalOrbFallback: fallback, deterministicOrbFallback: fallback, uncertainExternalOrbFallback: fallback,
    },
    './councilClient': {
      CouncilExternalProviderAttemptError, CouncilExternalProviderAttemptUncertainError,
      attemptedCouncilProviderFallback: fallback, uncertainCouncilProviderFallback: fallback,
    },
    './councilProviderRegistry': {
      COUNCIL_PROVIDER_REGISTRY: { openai: { label: 'OpenAI' }, anthropic: { label: 'Anthropic' } },
      LIVE_COUNCIL_PROVIDER_IDS: ['openai'],
      REQUESTABLE_COUNCIL_PROVIDER_IDS: ['openai', 'anthropic'],
      PENDING_COUNCIL_PROVIDER_IDS: [],
      requestCouncilProvider(input) { const next = deferred(); requests.push({ input, ...next }); return next.promise },
    },
  }
  const code = ts.transpileModule(fs.readFileSync(componentPath, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, AbortController,
    require(name) { assert.ok(name in imports, 'Unexpected production import: ' + name); return imports[name] },
  }, { filename: componentPath.pathname })
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let mounted = true
  const render = agent => act(() => root.render(React.createElement(module.exports.default, { agent })))
  const element = selector => { const node = container.querySelector(selector); assert.ok(node, 'Missing element ' + selector); return node }
  const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))]
  const change = (selector, currentTarget) => act(() => props(element(selector)).onChange({ currentTarget }))
  const submit = () => { act(() => { void props(element('form')).onSubmit({ preventDefault() {} }) }) }
  const ask = (message = 'Tell me about this memory') => {
    change('textarea', { value: message })
    change('input', { checked: true })
    submit()
  }
  const resolve = async (index, value = answer('Synthetic completed answer')) => {
    await act(async () => { requests[index].resolve(value); await Promise.resolve() })
  }
  const reject = async index => { await act(async () => { requests[index].reject(new Error('late adapter failure')); await Promise.resolve() }) }
  const unmount = () => { if (mounted) { act(() => root.unmount()); mounted=false } }
  t.after(() => { unmount(); container.parentNode?.removeChild(container) })
  render(agents[0])
  return { requests, container, render, ask, submit, resolve, reject, unmount, change, element, props,
    text: () => container.textContent,
    stop: () => act(() => { props(container.querySelectorAll('button')[1]).onClick() }),
  }
}

test('leaving Council aborts its in-flight request', t => {
  const f=fixture(t); f.ask(); const signal=f.requests[0].input.signal
  f.unmount()
  assert.equal(signal.aborted, true)
})

test('switching Council presence aborts the prior request and clears its draft and consent', t => {
  const f=fixture(t); f.ask('Cartographer-only question'); const signal=f.requests[0].input.signal
  f.render(agents[1])
  assert.equal(signal.aborted, true)
  assert.equal(f.element('textarea').value, '')
  assert.equal(f.element('input').checked, false)
  assert.equal(f.element('form').getAttribute('aria-busy'), 'false')
  assert.ok(!f.text().includes('Cartographer is considering'))
})

test('a late success cannot label the previous presence answer as the selected presence', async t => {
  const f=fixture(t); f.ask(); f.render(agents[1])
  await f.resolve(0, answer('Old cartographer answer'))
  assert.ok(!f.text().includes('Old cartographer answer'))
  assert.match(f.text(), /Ask The Archivist/)
})

test('a late error from the previous presence cannot replace the selected presence state', async t => {
  const f=fixture(t); f.ask(); f.render(agents[1])
  await f.reject(0)
  assert.ok(!f.text().includes('Local fallback'))
  assert.ok(!f.text().includes('did not return a usable answer'))
})

test('a completed answer and bounded context do not carry into a different Council presence', async t => {
  const f=fixture(t); f.ask('Cartographer-only question'); await f.resolve(0, answer('Cartographer-only answer'))
  f.render(agents[1])
  assert.ok(!f.text().includes('Cartographer-only answer'))
  f.ask('Archivist question')
  assert.equal(f.requests[1].input.context.length, 0)
  assert.match(f.requests[1].input.message, /Council presence: The Archivist/)
})

test('same presence rerender retains the current request', async t => {
  const f=fixture(t); f.ask(); f.render({ ...agents[0] })
  assert.equal(f.requests[0].input.signal.aborted, false)
  await f.resolve(0, answer('Same presence answer'))
  assert.match(f.text(), /Same presence answer/)
})

test('changed role context for the same id starts a fresh Council session', t => {
  const f=fixture(t); f.ask()
  f.render({ ...agents[0], focus: 'A newly selected focus' })
  assert.equal(f.requests[0].input.signal.aborted, true)
  assert.equal(f.element('input').checked, false)
})

test('Stop aborts and suppresses stale completion while a replacement question remains active', async t => {
  const f=fixture(t); f.ask(); f.stop(); f.ask('New question')
  assert.equal(f.requests[0].input.signal.aborted, true)
  await f.resolve(0, answer('Stopped answer'))
  assert.ok(!f.text().includes('Stopped answer'))
  assert.equal(f.element('form').getAttribute('aria-busy'), 'true')
  await f.resolve(1, answer('Replacement answer'))
  assert.match(f.text(), /Replacement answer/)
})

test('successful same-presence exchanges keep bounded context and truthful provider labels', async t => {
  const f=fixture(t); f.ask('Question one'); await f.resolve(0, answer('Answer one'))
  f.ask('Question two')
  assert.equal(f.requests[1].input.context.length, 2)
  assert.equal(f.requests[1].input.context[0].content, 'Question one')
  await f.resolve(1, answer('Answer two'))
  assert.match(f.text(), /The Cartographer responded through OpenAI/)
})

test('a unavailable provider retains the disclosed local fallback without adding provider history', async t => {
  const f=fixture(t); f.ask(); await f.resolve(0, null)
  assert.match(f.text(), /local fallback is shown/)
  f.ask('Next question')
  assert.equal(f.requests[1].input.context.length, 0)
})

