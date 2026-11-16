import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { localizedMessage, serverLocalePreference } from '../src/lib/i18n/localePreference.ts'

const runtime = fs.readFileSync('src/app/HomeSpatialRuntimeLayer.tsx', 'utf8')

function lifecycle(pathname) {
  const effects = []
  const classes = new Set()
  const body = { style: { cursor: 'pointer' }, classList: {
    add: (name) => classes.add(name), remove: (name) => classes.delete(name),
  } }
  const exports = {}
  const jsx = (type, props) => ({ type, props })
  const compiled = ts.transpileModule(runtime, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  vm.runInNewContext(compiled, { exports, document: { body }, require(id) {
    if (id === 'react') return {
      useCallback: (fn) => fn, useRef: () => ({ current: null }),
      useState: (initial) => [initial, () => {}], useEffect: (setup) => effects.push(setup),
    }
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (id === 'next/navigation') return { usePathname: () => pathname }
    if (id === './HomeSpatialCanvas') return { useWebGLAvailable: () => true }
    if (id === '@/lib/i18n/useUraiLocale') return { useUraiLocale: () => ({
      text: id => localizedMessage(serverLocalePreference(), id).text,
      props: id => {
        const message = localizedMessage(serverLocalePreference(), id)
        return { lang: message.locale, dir: message.direction, 'data-urai-translation-preview': String(message.preview) }
      },
    }) }
    return { default: () => null }
  } })
  exports.default()
  return { body, classes, setup: effects[0] }
}

test('Home spatial runtime resets its cursor and body class on unmount', () => {
  for (const route of ['/', '/home', '/home/']) {
    const { body, classes, setup } = lifecycle(route)
    const cleanup = setup()
    assert.equal(body.style.cursor, 'default')
    assert.equal(classes.has('urai-home-webgl-active'), true)
    body.style.cursor = 'pointer'
    cleanup()
    assert.equal(body.style.cursor, 'default')
    assert.equal(classes.has('urai-home-webgl-active'), false)
  }
})

test('non-Home routes do not retain the Home cursor or body class', () => {
  const { body, classes, setup } = lifecycle('/replay')
  classes.add('urai-home-webgl-active')
  setup()
  assert.equal(body.style.cursor, 'default')
  assert.equal(classes.has('urai-home-webgl-active'), false)
})

// Exercise the complete current fallback component with explicit hook/DOM adapters.
// This is input ownership behavior, not a browser rendering or device acceptance test.
const fallbackSource = fs.readFileSync('src/app/HomeSpatialWorldFinal.tsx', 'utf8')
const fallbackCompiled = ts.transpileModule(fallbackSource, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText

function fallbackKeyboard() {
  const effects = [], refs = [], states = [], clears = [], listeners = new Map()
  class ElementAdapter {
    constructor(options = {}) { Object.assign(this, { tagName: 'DIV', role: null, parentElement: null, isContentEditable: false }, options) }
    closest(selector) {
      assert.equal(selector, 'input, textarea, select, [role="textbox"], [role="combobox"]')
      for (let node = this; node; node = node.parentElement) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || ['textbox', 'combobox'].includes(node.role)) return node
      }
      return null
    }
  }
  const exports = {}, jsx = (type, props) => ({ type, props })
  vm.runInNewContext(fallbackCompiled, { exports, HTMLElement: ElementAdapter,
    clearTimeout: timer => clears.push(timer),
    window: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name) },
    },
    require(id) {
      if (id === 'react') return {
        useCallback: fn => fn,
        useRef: initial => { const ref = { current: initial }; refs.push(ref); return ref },
        useState: initial => {
          const index = states.push(initial) - 1
          return [initial, next => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
        },
        useEffect: setup => effects.push(setup),
      }
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (id === 'next/link') return { default: () => null }
      throw new Error(`Unexpected fallback import: ${id}`)
    },
  })
  exports.default()
  assert.equal(effects.length, 1)
  const cleanup = effects[0]()
  function key(options = {}) {
    let prevented = 0
    const event = { key: 'o', target: new ElementAdapter(), defaultPrevented: false,
      isComposing: false, repeat: false, ctrlKey: false, metaKey: false, altKey: false,
      preventDefault() { prevented += 1; this.defaultPrevented = true }, ...options }
    listeners.get('keydown')?.(event)
    return { event, prevented }
  }
  return { ElementAdapter, states, refs, clears, listeners, cleanup, key }
}

for (const key of ['o', 'O']) test(`fallback shortcut retains ordinary ${key} activation`, () => {
  const home = fallbackKeyboard()
  assert.equal(home.key({ key }).prevented, 1)
  assert.deepEqual(home.states, [true, 'orb'])
  home.key({ key })
  assert.deepEqual(home.states, [false, 'orb'])
  home.cleanup()
})
for (const flag of ['defaultPrevented', 'isComposing', 'repeat', 'ctrlKey', 'metaKey', 'altKey']) {
  test(`fallback shortcut respects ${flag}`, () => {
    const home = fallbackKeyboard()
    assert.equal(home.key({ [flag]: true }).prevented, 0)
    assert.deepEqual(home.states, [false, null])
    home.cleanup()
  })
}
for (const control of ['input', 'textarea', 'select', 'role=textbox', 'role=combobox', 'nested textbox child']) {
  test(`fallback shortcut does not consume ${control} entry`, () => {
    const home = fallbackKeyboard()
    const target = control.startsWith('role=')
      ? new home.ElementAdapter({ role: control.slice(5) })
      : control === 'nested textbox child'
        ? new home.ElementAdapter({ tagName: 'SPAN', parentElement: new home.ElementAdapter({ role: 'textbox' }) })
        : new home.ElementAdapter({ tagName: control.toUpperCase() })
    assert.equal(home.key({ target }).prevented, 0)
    assert.deepEqual(home.states, [false, null])
    home.cleanup()
  })
}
test('fallback shortcut respects inherited and plaintext contenteditable entry', () => {
  const home = fallbackKeyboard()
  assert.equal(home.key({ target: new home.ElementAdapter({ isContentEditable: true }) }).prevented, 0)
  assert.deepEqual(home.states, [false, null])
  home.cleanup()
})
test('fallback Escape still cancels its pending transition and closes its panel', () => {
  const home = fallbackKeyboard()
  home.key()
  home.refs[1].current = 17
  home.key({ key: 'Escape' })
  assert.deepEqual(home.states, [false, null])
  assert.deepEqual(home.clears, [17])
  assert.equal(home.refs[1].current, null)
  home.cleanup()
})
test('fallback unrelated keys and unmount retain existing ownership and cleanup', () => {
  const home = fallbackKeyboard()
  assert.equal(home.key({ key: 'w' }).prevented, 0)
  assert.deepEqual(home.states, [false, null])
  home.refs[1].current = 23
  home.cleanup()
  assert.equal(home.listeners.size, 0)
  assert.deepEqual(home.clears, [23])
})
