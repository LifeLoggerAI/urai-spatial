import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const keyDownBlock = source.match(/const keyDown = \(event: KeyboardEvent\) => \{[\s\S]*?\n    \};\n    const keyUp/)
assert.ok(keyDownBlock, 'production flight keyDown body was not found')
const fragment = keyDownBlock[0].replace(/\n    const keyUp$/, '')
const compiled = ts.transpileModule(
  "const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE']);\n" + fragment + '\nexport { keyDown };',
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

class FakeElement {
  constructor(kind = 'other', editable = false) { this.kind = kind; this.isContentEditable = editable }
  closest(selector) { return this.kind === 'input' && selector.includes('input') ? this : null }
}

function harness() {
  let dialogOpen = false
  const document = { querySelector: () => dialogOpen ? {} : null }
  const keys = new Set()
  const heldFlightKeys = { current: keys }
  const flightOffset = { current: { x: 2, y: 4, z: 6, set(x, y, z) { this.x = x; this.y = y; this.z = z } } }
  const flightVelocity = { current: { x: 1, y: 2, z: 3, set(x, y, z) { this.x = x; this.y = y; this.z = z } } }
  const release = () => { keys.clear(); flightVelocity.current.set(0, 0, 0) }
  const module = { exports: {} }
  new Function('module', 'exports', 'document', 'HTMLElement', 'heldFlightKeys', 'flightOffset', 'flightVelocity', 'release', compiled)(
    module, module.exports, document, FakeElement, heldFlightKeys, flightOffset, flightVelocity, release,
  )
  function press(code, target = new FakeElement(), modifiers = {}) {
    const event = {
      code, target, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false,
      wasPrevented: false, preventDefault() { this.wasPrevented = true }, ...modifiers,
    }
    module.exports.keyDown(event)
    return event
  }
  return { keys, flightOffset, flightVelocity, press, setDialog: value => { dialogOpen = value } }
}

test('camera keyboard permits exploration but prevents page scroll', () => {
  const h = harness()
  const e = h.press('KeyW')
  assert.equal(e.wasPrevented, true)
  assert.equal(h.keys.has('KeyW'), true)
})

test('a newly opened modal clears held movement and velocity', () => {
  const h = harness()
  h.press('KeyW')
  h.setDialog(true)
  const e = h.press('KeyW')
  assert.equal(e.wasPrevented, false)
  assert.deepEqual([...h.keys], [])
  assert.equal(h.flightVelocity.current.x, 0)
})

test('typing in an editor clears held movement and velocity', () => {
  const h = harness()
  h.press('KeyD')
  const e = h.press('KeyA', new FakeElement('input'))
  assert.equal(e.wasPrevented, false)
  assert.deepEqual([...h.keys], [])
  assert.equal(h.flightVelocity.current.y, 0)
})

test('R recenters displacement and clears movement without selecting a star', () => {
  const h = harness()
  h.press('KeyW')
  const e = h.press('KeyR')
  assert.equal(e.wasPrevented, true)
  assert.deepEqual([h.flightOffset.current.x, h.flightOffset.current.y, h.flightOffset.current.z], [0, 0, 0])
  assert.deepEqual([...h.keys], [])
  assert.equal(h.flightVelocity.current.z, 0)
})

test('modified shortcuts and pre-handled events do not become flight input', () => {
  const h = harness()
  h.press('KeyW', new FakeElement(), { ctrlKey: true })
  h.press('KeyW', new FakeElement(), { defaultPrevented: true })
  assert.deepEqual([...h.keys], [])
})

test('listener focus, blur, and unmount lifecycle retains release authority', () => {
  assert.match(source, /window\.addEventListener\('focusin', focusIn\)/)
  assert.match(source, /window\.removeEventListener\('focusin', focusIn\)/)
  assert.match(source, /window\.addEventListener\('blur', release\)/)
  assert.match(source, /window\.removeEventListener\('blur', release\)/)
  assert.match(source, /const release = \(\) => \{ heldFlightKeys\.current\.clear\(\); flightVelocity\.current\.set\(0, 0, 0\); \}/)
})
