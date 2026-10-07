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
