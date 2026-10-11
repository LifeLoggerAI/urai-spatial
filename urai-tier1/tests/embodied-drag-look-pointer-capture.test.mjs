import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute the complete production module. Only React hook storage and the DOM
// pointer-capture API are adapters; drag/capture decisions are not reimplemented.
// Native browser click targeting is separately verified by rendered Orb proof.
const sourceUrl = new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url)
const require = createRequire(sourceUrl)
const ts = require('typescript')
const THREE = require('three')
const jsxRuntime = require('react/jsx-runtime')
const compiled = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  fileName: sourceUrl.pathname,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function fixture(options = {}) {
  const captureOwners = new Map(), dragStates = [], refs = []
  let cursor = 0
  class ElementAdapter {
    constructor(tag, parentElement = null, attributes = {}) {
      this.tagName = tag.toUpperCase()
      this.parentElement = parentElement
      this.attributes = attributes
      this.captureCalls = []
      this.releaseCalls = []
    }
    closest(selector) {
      const selectors = selector.split(',').map(value => value.trim())
      for (let element = this; element; element = element.parentElement) {
        if (selectors.some(value => {
          const attribute = value.match(/^\[([^=]+)="([^"]*)"\]$/)
          return attribute ? element.attributes[attribute[1]] === attribute[2] : element.tagName.toLowerCase() === value.toLowerCase()
        })) return element
      }
      return null
    }
    setPointerCapture(pointerId) {
      this.captureCalls.push(pointerId)
      if (this.captureThrows) throw new Error('Synthetic browser capture failure')
      captureOwners.set(pointerId, this)
    }
    releasePointerCapture(pointerId) {
      this.releaseCalls.push(pointerId)
      if (this.releaseThrows) throw new Error('Synthetic browser release failure')
      if (captureOwners.get(pointerId) === this) captureOwners.delete(pointerId)
    }
    hasPointerCapture(pointerId) { return captureOwners.get(pointerId) === this }
  }
  class HTMLElementAdapter extends ElementAdapter {}
  const wrapper = new HTMLElementAdapter('main')
  const canvas = new HTMLElementAdapter('canvas', wrapper)
  const otherWrapper = new HTMLElementAdapter('section')
  const yaw = { current: .6 }, pitch = { current: .1 }
  let props = { yaw, pitch, sensitivity: .01, minPitch: -.5, maxPitch: .5, onDragState: value => dragStates.push(value), ...options }
  const react = {
    useRef(initial) { const index = cursor++; return refs[index] ??= { current: initial } },
    useCallback(callback) { return callback },
    useEffect() {},
    useState(initial) { return [initial, () => {}] },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    module, exports: module.exports, Element: ElementAdapter, HTMLElement: HTMLElementAdapter,
    require(name) {
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return jsxRuntime
      if (name === 'three') return THREE
      throw new Error(`Unexpected production dependency: ${name}`)
    },
  })
  let handlers
  const render = (next = {}) => { props = { ...props, ...next }; cursor = 0; handlers = module.exports.useDragLook(props); return handlers }
  render()
  const event = (overrides = {}) => ({ target: canvas, currentTarget: wrapper, pointerId: 17, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, clientX: 100, clientY: 100, ...overrides })
  const send = (name, overrides) => handlers[name](event(overrides))
  return { ElementAdapter, HTMLElementAdapter, wrapper, otherWrapper, canvas, captureOwners, dragStates, yaw, pitch, render, send }
}

for (const pointerType of ['mouse', 'touch', 'pen']) {
  test(`${pointerType} stationary canvas activation keeps capture and release on its originating canvas`, () => {
    const f = fixture()
    f.send('onPointerDown', { pointerType })
    assert.equal(f.captureOwners.get(17), f.canvas, 'The canvas must retain ownership instead of its React handler wrapper')
    assert.deepEqual(f.canvas.captureCalls, [17])
    assert.deepEqual(f.wrapper.captureCalls, [])
    f.render()
    f.send('onPointerUp', { pointerType, currentTarget: f.otherWrapper, buttons: 0 })
    assert.deepEqual(f.canvas.releaseCalls, [17], 'Release must use the original capture element across rerenders and changed currentTarget')
    assert.deepEqual(f.wrapper.releaseCalls, [])
    assert.deepEqual(f.otherWrapper.releaseCalls, [])
    assert.equal(f.captureOwners.size, 0)
    assert.deepEqual(f.dragStates, [true, false])
    assert.equal(f.yaw.current, .6)
    assert.equal(f.pitch.current, .1)
  })
}

test('pointer cancellation releases the original canvas and subsequent movement is inert', () => {
  const f = fixture()
  f.send('onPointerDown')
  f.send('onPointerMove', { clientX: 120, clientY: 80 })
  f.send('onPointerCancel', { currentTarget: f.otherWrapper })
  assert.deepEqual(f.canvas.releaseCalls, [17])
  assert.deepEqual(f.otherWrapper.releaseCalls, [])
  assert.equal(f.captureOwners.size, 0)
  const stopped = [f.yaw.current, f.pitch.current]
  f.send('onPointerMove', { clientX: 400, clientY: 400 })
  f.send('onPointerUp', { currentTarget: f.wrapper })
  assert.deepEqual([f.yaw.current, f.pitch.current], stopped)
  assert.deepEqual(f.dragStates, [true, false])
})

test('a nonmatching pointer cannot move or finish the active drag', () => {
  const f = fixture()
  f.send('onPointerDown')
  f.send('onPointerMove', { pointerId: 29, clientX: 400, clientY: -400 })
  f.send('onPointerUp', { pointerId: 29 })
  f.send('onPointerCancel', { pointerId: 29 })
  assert.equal(f.yaw.current, .6)
  assert.equal(f.pitch.current, .1)
  assert.deepEqual(f.dragStates, [true])
  assert.deepEqual(f.canvas.releaseCalls, [])
  assert.deepEqual(f.wrapper.releaseCalls, [])
  f.send('onPointerMove', { clientX: 110, clientY: 90 })
  assert.ok(Math.abs(f.yaw.current - .5) < 1e-12)
  assert.ok(Math.abs(f.pitch.current - .2) < 1e-12)
  f.send('onPointerUp')
  assert.deepEqual(f.dragStates, [true, false])
})

for (const tag of ['button', 'a', 'input', 'textarea', 'select', 'summary', 'movement-control']) {
  test(`presses originating inside ${tag} remain owned by that control`, () => {
    const f = fixture()
    const owner = tag === 'movement-control'
      ? new f.HTMLElementAdapter('div', f.wrapper, { 'data-movement-ui': 'true' })
      : new f.HTMLElementAdapter(tag, f.wrapper)
    const descendant = new f.HTMLElementAdapter('span', owner)
    f.send('onPointerDown', { target: descendant })
    f.send('onPointerMove', { target: descendant, clientX: 300, clientY: 300 })
    f.send('onPointerUp', { target: descendant })
    assert.equal(f.captureOwners.size, 0)
    assert.deepEqual(f.wrapper.captureCalls, [])
    assert.deepEqual(f.canvas.captureCalls, [])
    assert.deepEqual(descendant.captureCalls, [])
    assert.deepEqual(f.dragStates, [])
    assert.equal(f.yaw.current, .6)
    assert.equal(f.pitch.current, .1)
  })
}

for (const [label, options, event] of [
  ['disabled navigation', { enabled: false }, {}],
  ['right mouse button', {}, { button: 2, buttons: 2 }],
]) {
  test(`${label} never takes pointer capture or starts camera drag`, () => {
    const f = fixture(options)
    f.send('onPointerDown', event)
    f.send('onPointerMove', { ...event, clientX: 400, clientY: 400 })
    f.send('onPointerUp', event)
    assert.equal(f.captureOwners.size, 0)
    assert.deepEqual(f.wrapper.captureCalls, [])
    assert.deepEqual(f.canvas.captureCalls, [])
    assert.deepEqual(f.dragStates, [])
    assert.equal(f.yaw.current, .6)
    assert.equal(f.pitch.current, .1)
  })
}

test('ordinary drag preserves yaw direction, sensitivity, pitch limits, and stopped state', () => {
  const f = fixture()
  f.send('onPointerDown')
  f.send('onPointerMove', { clientX: 140, clientY: 80 })
  assert.ok(Math.abs(f.yaw.current - .2) < 1e-12)
  assert.ok(Math.abs(f.pitch.current - .3) < 1e-12)
  f.render()
  f.send('onPointerMove', { clientX: 160, clientY: -1000 })
  assert.ok(Math.abs(f.yaw.current) < 1e-12)
  assert.equal(f.pitch.current, .5)
  f.send('onPointerMove', { clientX: 170, clientY: 1000 })
  assert.ok(Math.abs(f.yaw.current + .1) < 1e-12)
  assert.equal(f.pitch.current, -.5)
  f.send('onPointerUp')
  const stopped = [f.yaw.current, f.pitch.current]
  f.send('onPointerMove', { clientX: 800, clientY: 800 })
  assert.deepEqual([f.yaw.current, f.pitch.current], stopped)
  assert.deepEqual(f.dragStates, [true, false])
})

test('best-effort browser capture failures do not wedge drag state', () => {
  const f = fixture()
  f.canvas.captureThrows = true
  f.canvas.releaseThrows = true
  f.wrapper.captureThrows = true
  f.wrapper.releaseThrows = true
  assert.doesNotThrow(() => f.send('onPointerDown'))
  f.send('onPointerMove', { clientX: 110, clientY: 90 })
  assert.ok(Math.abs(f.yaw.current - .5) < 1e-12)
  assert.ok(Math.abs(f.pitch.current - .2) < 1e-12)
  assert.doesNotThrow(() => f.send('onPointerCancel'))
  const stopped = [f.yaw.current, f.pitch.current]
  f.send('onPointerMove', { clientX: 200, clientY: 200 })
  assert.deepEqual([f.yaw.current, f.pitch.current], stopped)
  assert.deepEqual(f.dragStates, [true, false])
})
