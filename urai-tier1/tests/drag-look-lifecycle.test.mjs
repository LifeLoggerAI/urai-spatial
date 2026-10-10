import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const source = fs.readFileSync(new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText

function fixture() {
  const cells = [], effects = [], states = []
  let cursor = 0
  class Element {
    captured = new Set()
    closest() { return null }
    setPointerCapture(id) { this.captured.add(id) }
    releasePointerCapture(id) { this.captured.delete(id) }
  }
  const window = new EventTarget(), document = new EventTarget(), owner = new Element()
  document.visibilityState = 'visible'
  const yaw = { current: 0 }, pitch = { current: 0 }
  const onDragState = value => states.push(value)
  const hooks = {
    useRef: initial => { const index = cursor++; cells[index] ??= { current: initial }; return cells[index] },
    useCallback: callback => { cursor++; return callback },
    useEffect: (operation, deps) => {
      const index = cursor++, previous = cells[index]
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) effects.push(() => { previous?.cleanup?.(); cells[index] = { deps, cleanup: operation() } })
    },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, Element, HTMLElement: Element, window, document, require: id => {
    if (id === 'react') return hooks
    if (id === 'three') return THREE
    if (id === 'react/jsx-runtime') return {}
    if (id.includes('cameraMotion')) return {}
    throw new Error(id)
  } })
  const render = enabled => { cursor = 0; const handlers = module.exports.useDragLook({ yaw, pitch, enabled, sensitivity: .0031, onDragState }); while (effects.length) effects.shift()(); return handlers }
  const event = (values = {}) => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, currentTarget: owner, target: owner, ...values })
  return { window, document, owner, yaw, pitch, states, event, render, unmount() { for (const cell of cells) cell?.cleanup?.() } }
}

test('a Home click retains its physical hit target until a real look drag begins', () => {
  const f = fixture(), h = f.render(true)
  h.onPointerDown(f.event())
  h.onPointerMove(f.event({ clientX: 103 }))
  assert.equal(f.owner.captured.size, 0, 'a click was captured away from the Three hit target')
  assert.equal(f.yaw.current, 0)
  assert.deepEqual(f.states, [])
  h.onPointerMove(f.event({ clientX: 120 }))
  assert.equal(f.owner.captured.size, 1)
  assert.ok(f.yaw.current < 0)
  assert.deepEqual(f.states, [true])
  h.onPointerUp(f.event({ clientX: 120 }))
  assert.equal(f.owner.captured.size, 0)
  assert.deepEqual(f.states, [true, false])
  f.unmount()
})

test('transition ownership disables and releases a captured look before stale pointer movement', () => {
  const f = fixture(), h = f.render(true)
  h.onPointerDown(f.event()); h.onPointerMove(f.event({ clientX: 120 }))
  const yaw = f.yaw.current
  f.render(false)
  h.onPointerMove(f.event({ clientX: 150 }))
  assert.equal(f.yaw.current, yaw)
  assert.equal(f.owner.captured.size, 0)
  assert.equal(f.states.at(-1), false)
  f.unmount()
})

for (const trigger of ['blur', 'pagehide', 'hidden', 'capture-lost', 'unmount']) {
  test(`look ownership is released on ${trigger}`, () => {
    const f = fixture(), h = f.render(true)
    h.onPointerDown(f.event()); h.onPointerMove(f.event({ clientX: 120 }))
    const yaw = f.yaw.current
    if (trigger === 'hidden') { f.document.visibilityState = 'hidden'; f.document.dispatchEvent(new Event('visibilitychange')) }
    else if (trigger === 'capture-lost') { f.owner.captured.clear(); h.onLostPointerCapture?.(f.event()) }
    else if (trigger === 'unmount') f.unmount()
    else f.window.dispatchEvent(new Event(trigger))
    h.onPointerMove(f.event({ clientX: 150 }))
    assert.equal(f.yaw.current, yaw, 'stale look input retained camera ownership')
    assert.equal(f.states.at(-1), false)
    assert.equal(f.owner.captured.size, 0)
    f.unmount()
  })
}

test('a secondary pointer cannot steal the active look gesture or fabricate camera motion', () => {
  const f = fixture(), h = f.render(true)
  h.onPointerDown(f.event()); h.onPointerMove(f.event({ clientX: 120 }))
  const yaw = f.yaw.current
  h.onPointerDown(f.event({ pointerId: 2, isPrimary: false }))
  h.onPointerMove(f.event({ pointerId: 2, isPrimary: false, clientX: 180 }))
  assert.equal(f.yaw.current, yaw)
  h.onPointerMove(f.event({ clientX: 130 }))
  assert.ok(f.yaw.current < yaw)
  h.onPointerCancel(f.event())
  assert.equal(f.owner.captured.size, 0)
  f.unmount()
})

for (const type of ['pointerup', 'pointercancel']) {
  test(`an uncaptured click ending outside Home on ${type} cannot block the next look`, () => {
    const f = fixture(), h = f.render(true)
    h.onPointerDown(f.event())
    const outside = new Event(type)
    Object.defineProperty(outside, 'pointerId', { value: 1 })
    f.window.dispatchEvent(outside)
    h.onPointerDown(f.event({ pointerId: 2, clientX: 300 }))
    h.onPointerMove(f.event({ pointerId: 2, clientX: 320 }))
    assert.ok(Math.abs(f.yaw.current + .062) < 1e-8, 'the previous uncaptured candidate retained gesture ownership')
    h.onPointerUp(f.event({ pointerId: 2, clientX: 320 }))
    f.unmount()
  })
}
