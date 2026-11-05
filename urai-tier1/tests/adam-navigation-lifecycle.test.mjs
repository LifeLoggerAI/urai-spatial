import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const runtimeSource = readFileSync(new URL('../src/spatial/adam/AdamPresenceRuntime.tsx', import.meta.url), 'utf8')
const surfaceSource = readFileSync(new URL('../src/spatial/adam/adamSurfaceContext.ts', import.meta.url), 'utf8')
const compile = (source) => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
} }).outputText

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function nodes(tree, predicate, found = []) {
  if (!tree || typeof tree !== 'object') return found
  if (predicate(tree)) found.push(tree)
  for (const child of [tree.props?.children].flat(Infinity)) nodes(child, predicate, found)
  return found
}

function fixture() {
  let cursor = 0
  const slots = [], effects = [], pendingEffects = [], requests = [], recognitions = []
  let pathname = '/adam', requestedSurface = 'investors'
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }]
    },
    useRef(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = { current: initial }
      return slots[i]
    },
    useCallback(callback, deps) {
      const i = cursor++, previous = slots[i]
      if (!previous || deps.some((dep, index) => dep !== previous.deps[index])) slots[i] = { callback, deps }
      return slots[i].callback
    },
    useEffect(callback, deps) {
      const i = cursor++, previous = effects[i]
      if (!previous || deps.some((dep, index) => dep !== previous.deps[index])) {
        effects[i] = { deps, cleanup: previous?.cleanup }
        pendingEffects.push(() => {
          previous?.cleanup?.()
          effects[i].cleanup = callback()
        })
      }
    },
  }
  class SpeechRecognition {
    constructor() { this.aborted = false; recognitions.push(this) }
    start() {}
    abort() { this.aborted = true }
  }
  const surfaces = { exports: {} }
  vm.runInNewContext(compile(surfaceSource), { exports: surfaces.exports, module: surfaces })
  class AdamProviderError extends Error {}
  const mocks = {
    react,
    'react-dom': { createPortal: (child) => child },
    'next/navigation': { usePathname: () => pathname, useSearchParams: () => ({ get: () => requestedSurface }) },
    '@/lib/i18n/localePreference': { currentSpeechTag: () => 'en-US' },
    '@/lib/i18n/contentLanguage': { contentLanguage: () => ({ speechTag: 'en-US' }), contentLanguageProps: () => ({ lang: 'en', dir: 'ltr' }) },
    '@/lib/i18n/useUraiLocale': { useUraiLocale: () => ({ text: () => 'Founder digital presence', props: () => ({ lang: 'en', dir: 'ltr' }) }) },
    './adamSurfaceContext': surfaces.exports,
    './adamClient': {
      AdamProviderError,
      requestAdamPresence: (input) => { const result = deferred(); requests.push({ input, ...result }); return result.promise },
      requestAdamFounderVoice: async () => ({ blob: null, errorCode: null }),
    },
    './AdamPresenceRuntime.module.css': { default: new Proxy({}, { get: (_target, name) => String(name) }), __esModule: true },
  }
  const module = { exports: {} }
  vm.runInNewContext(compile(runtimeSource), {
    module, exports: module.exports, require: (name) => {
      if (!(name in mocks)) throw new Error('Unmocked dependency ' + name)
      return mocks[name]
    },
    React: react, AbortController, crypto: webcrypto,
    MutationObserver: class { observe() {} disconnect() {} },
    document: { body: {}, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} },
    window: { SpeechRecognition }, getComputedStyle: () => ({}),
  })
  const render = () => {
    cursor = 0
    const tree = module.exports.default()
    while (pendingEffects.length) pendingEffects.shift()()
    return tree
  }
  const find = (tree, predicate) => {
    const found = nodes(tree, predicate)
    assert.equal(found.length, 1)
    return found[0]
  }
  const open = () => {
    find(render(), n => n.props?.['data-urai-adam-launcher'] === 'true').props.onClick()
    render()
    return render()
  }
  const prepare = (message = 'private investor memory') => {
    let tree = render()
    find(tree, n => n.type === 'textarea').props.onChange({ target: { value: message } })
    const ai = nodes(tree, n => n.type === 'input' && n.props.type === 'checkbox')[0]
    ai.props.onChange({ target: { checked: true } })
    return render()
  }
  const submit = (message) => {
    const tree = prepare(message)
    return find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  }
  const navigate = (path, surface = null) => { pathname = path; requestedSurface = surface; render(); return render() }
  const snapshot = () => JSON.stringify(slots.map(value => typeof value === 'object' ? (Array.isArray(value) ? value : undefined) : value))
  const result = (caption = 'OLD_PRIVATE_RESPONSE') => ({ message: caption, caption, locale: 'en-US', provider: 'openai', requiresHumanFounder: false, handoffReason: '', suggestedActions: [] })
  return { render, find, open, submit, navigate, snapshot, result, requests, recognitions,
    unmount: () => { for (const effect of effects) effect?.cleanup?.() } }
}

test('digital-Founder disclosure is visible in the header without expanding About', () => {
  const f = fixture(), tree = f.open()
  const header = f.find(tree, n => n.type === 'header')
  assert.equal(nodes(header, n => n.type === 'p' && n.props.children.includes('Founder digital presence')).length, 1)
  assert.equal(nodes(header, n => n.type === 'details').length, 0)
})

for (const [name, path, surface] of [
  ['route change', '/home', null],
  ['same-route surface change', '/adam', 'foundation'],
  ['hidden privacy route', '/privacy-controls', null],
]) test(name + ' aborts and clears private context; late delta and result cannot publish', async () => {
  const f = fixture(); f.open()
  const task = f.submit(), request = f.requests[0]
  f.navigate(path, surface)
  assert.equal(request.input.signal.aborted, true)
  assert.equal(f.snapshot().includes('private investor memory'), false)
  const cleared = f.snapshot()
  request.input.onEvent({ type: 'delta', text: 'OLD_PRIVATE_DELTA', locale: 'en-US' })
  request.resolve(f.result())
  await task
  assert.equal(f.snapshot(), cleared)
})

test('old rejection and finally cannot stop or alter a new surface request', async () => {
  const f = fixture(); f.open()
  const oldTask = f.submit(), oldRequest = f.requests[0]
  f.navigate('/adam', 'foundation')
  const newTask = f.submit('new foundation request'), newRequest = f.requests[1]
  const before = f.snapshot()
  oldRequest.reject(new Error('OLD_PRIVATE_ERROR'))
  await oldTask
  assert.equal(f.snapshot(), before)
  assert.equal(newRequest.input.signal.aborted, false)
  newRequest.resolve(f.result('NEW_RESPONSE'))
  await newTask
  assert.equal(f.snapshot().includes('NEW_RESPONSE'), true)
})

test('speech callbacks delivered after navigation cannot repopulate context', () => {
  const f = fixture(); const tree = f.open()
  const voice = nodes(tree, n => n.type === 'button' && n.props.children.includes('Talk'))[0]
  assert.ok(voice)
  voice.props.onClick()
  const recognition = f.recognitions[0]
  f.navigate('/adam', 'foundation')
  assert.equal(recognition.aborted, true)
  const cleared = f.snapshot()
  recognition.onresult({ results: [{ 0: { transcript: 'OLD_PRIVATE_SPEECH' } }] })
  recognition.onend()
  recognition.onerror()
  assert.equal(f.snapshot(), cleared)
})

test('unchanged context does not cancel a current request', async () => {
  const f = fixture(); f.open(); const task = f.submit(), request = f.requests[0]
  f.navigate('/adam', 'investors')
  assert.equal(request.input.signal.aborted, false)
  request.resolve(f.result('CURRENT_RESPONSE'))
  await task
  assert.equal(f.snapshot().includes('CURRENT_RESPONSE'), true)
})

test('unmount suppresses delayed provider callbacks and completion', async () => {
  const f = fixture(); f.open(); const task = f.submit(), request = f.requests[0]
  f.unmount(); assert.equal(request.input.signal.aborted, true)
  const stopped = f.snapshot()
  request.input.onEvent({ type: 'delta', text: 'OLD_PRIVATE_DELTA', locale: 'en-US' })
  request.resolve(f.result()); await task
  assert.equal(f.snapshot(), stopped)
})
