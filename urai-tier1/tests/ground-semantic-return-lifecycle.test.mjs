import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const three = require('three')
const componentPath = new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url)
const movementPath = new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url)
const eventsPath = new URL('../src/spatial/world/worldEvents.ts', import.meta.url)

// Exercise the actual component callbacks and the actual movement hook against
// DOM event semantics. No source-string assertions or copied return callbacks.
class Target {
  constructor(kind = '', { editable = false, movement = false } = {}) {
    this.kind = kind
    this.isContentEditable = editable
    this.movement = movement
  }
  closest(selector) {
    if (selector.includes('[data-movement-ui') && this.movement) return this
    if (this.kind && selector.includes(this.kind)) return this
    return null
  }
}

class EventSurface {
  listeners = []
  addEventListener(type, callback, options) {
    this.listeners.push({ type, callback, capture: options === true || options?.capture === true })
  }
  removeEventListener(type, callback, options) {
    const capture = options === true || options?.capture === true
    this.listeners = this.listeners.filter(item => item.type !== type || item.callback !== callback || item.capture !== capture)
  }
  dispatchEvent(event) {
    for (const listener of [...this.listeners].filter(item => item.type === event.type).sort((a, b) => Number(b.capture) - Number(a.capture))) {
      listener.callback(event)
      if (event.immediatePropagationStopped) break
    }
    return !event.defaultPrevented
  }
}

class HarnessEvent {
  constructor(type, fields = {}) { Object.assign(this, { type, defaultPrevented: false }, fields) }
  preventDefault() { this.defaultPrevented = true }
  stopImmediatePropagation() { this.immediatePropagationStopped = true }
}

function findElement(value, predicate) {
  if (!value || typeof value !== 'object') return null
  if (predicate(value)) return value
  for (const child of [value.props?.children].flat(Infinity)) {
    const found = findElement(child, predicate)
    if (found) return found
  }
  return null
}

function mount({ webgl = false } = {}) {
  const window = new EventSurface()
  const document = new EventSurface()
  const effects = []
  const cleanups = []
  const routerCalls = []
  let returns = 0
  let globalKeyboardReturns = 0
  let movementInput
  const react = {
    useRef: value => ({ current: value }),
    useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useMemo: callback => callback(),
    useCallback: callback => callback,
    useEffect: callback => effects.push(callback),
  }
  const jsx = (type, props) => ({ type, props })
  const modules = new Map([
    ['react', react],
    ['react/jsx-runtime', { jsx, jsxs: jsx, Fragment: 'fragment' }],
    ['three', three],
    ['next/navigation', { useRouter: () => ({ push: href => routerCalls.push(href) }), useSearchParams: () => new URLSearchParams() }],
    ['./HomeSpatialCanvas', { useWebGLAvailable: () => webgl }],
    ['./ground/GroundWorldModel', { DESTINATIONS: [] }],
    ['@/spatial/store/useSceneStore', { useSceneStore: { getState: () => ({}) } }],
    ['../store/useSceneStore', { useSceneStore: { getState: () => ({}) } }],
    ['@react-three/fiber', { Canvas: 'canvas', useFrame() {}, useThree: () => ({}) }],
    ['@react-three/drei', { Sparkles: 'sparkles', useAnimations: () => ({}), useGLTF: Object.assign(() => ({}), { preload() {} }) }],
    ['@react-three/postprocessing', { Bloom: 'bloom', EffectComposer: 'composer', Vignette: 'vignette' }],
    ['@/spatial/adam/AdamLauncherSlot', { __esModule: true, default: 'founder-slot' }],
  ])
  const context = vm.createContext({ window, document, Element: Target, HTMLElement: Target, Event: HarnessEvent, CustomEvent: HarnessEvent, URL, URLSearchParams, setTimeout, clearTimeout, console })
  function load(path) {
    const source = readFileSync(path, 'utf8')
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    const factory = vm.runInContext(`(function(require,module,exports){${output}\n})`, context)
    factory(name => {
      if (!modules.has(name)) throw new Error(`Unexpected runtime import: ${name}`)
      return modules.get(name)
    }, module, module.exports)
    return module.exports
  }
  const events = load(eventsPath)
  modules.set('@/spatial/world/worldEvents', events)
  const movement = load(movementPath)
  modules.set('@/spatial/navigation/EmbodiedNavigation', {
    ...movement,
    useMovementInput: options => {
      movementInput = movement.useMovementInput(options)
      return movementInput
    },
  })
  const ground = load(componentPath)
  window.addEventListener('urai:world-return', () => { returns += 1 })
  const rendered = ground.default()
  for (const effect of effects) {
    const cleanup = effect()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  }
  // The world controller's bubble fallback must not duplicate the captured
  // realm-owned Escape after preventDefault/stopImmediatePropagation.
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.defaultPrevented) globalKeyboardReturns += 1 })
  return {
    window, document, rendered, routerCalls, movementInput,
    get returns() { return returns },
    get globalKeyboardReturns() { return globalKeyboardReturns },
    key(fields = {}) {
      const event = new HarnessEvent('keydown', { code: 'Escape', key: 'Escape', target: new Target(), ...fields })
      window.dispatchEvent(event)
      return event
    },
    unmount() { for (const cleanup of cleanups.reverse()) cleanup() },
  }
}

for (const webgl of [false, true]) {
  test(`actual Ground Home button uses canonical return (${webgl ? 'WebGL' : 'fallback'})`, () => {
    const page = mount({ webgl })
    const home = findElement(page.rendered, element => element.props?.className === 'ground-home-return')
    assert.ok(home, 'visible Ground Home button must exist')
    home.props.onClick()
    assert.equal(page.returns, 1)
    assert.deepEqual(page.routerCalls, [])
    page.unmount()
  })
}

test('actual Ground Escape emits one canonical return and consumes its keyboard event', () => {
  const page = mount()
  const event = page.key()
  assert.equal(page.returns, 1)
  assert.deepEqual(page.routerCalls, [])
  assert.equal(event.defaultPrevented, true)
  assert.equal(event.immediatePropagationStopped, true)
  assert.equal(page.globalKeyboardReturns, 0)
  page.unmount()
})

for (const target of ['input', 'textarea', 'select', '[role="textbox"]', 'button', 'a', 'summary']) {
  test(`actual movement hook preserves ${target} keyboard ownership`, () => {
    const page = mount()
    const event = page.key({ target: new Target(target) })
    assert.equal(page.returns, 0)
    assert.deepEqual(page.routerCalls, [])
    assert.equal(event.defaultPrevented, false)
    page.unmount()
  })
}

test('actual movement hook preserves inherited or plaintext editable ownership', () => {
  const page = mount()
  const event = page.key({ target: new Target('', { editable: true }) })
  assert.equal(page.returns, 0)
  assert.deepEqual(page.routerCalls, [])
  assert.equal(event.defaultPrevented, false)
  page.unmount()
})

test('actual movement hook leaves an already consumed Escape alone', () => {
  const page = mount()
  const event = page.key({ defaultPrevented: true })
  assert.equal(page.returns, 0)
  assert.deepEqual(page.routerCalls, [])
  assert.equal(event.immediatePropagationStopped, undefined)
  page.unmount()
})

test('actual movement hook preserves text editing and already-consumed movement', () => {
  const page = mount()
  const editing = page.key({ code: 'KeyW', key: 'w', target: new Target('input') })
  assert.equal(editing.defaultPrevented, false)
  const consumed = page.key({ code: 'KeyW', key: 'w', defaultPrevented: true })
  assert.equal(consumed.immediatePropagationStopped, undefined)
  assert.equal(page.movementInput.keys.current.size, 0)
  page.unmount()
})

test('actual movement control remains usable and blur clears held movement', () => {
  const page = mount()
  const event = page.key({ code: 'KeyW', key: 'w', target: new Target('button', { movement: true }) })
  assert.equal(event.defaultPrevented, true)
  assert.equal(page.movementInput.keys.current.has('KeyW'), true)
  page.movementInput.virtualX.current = 1
  page.movementInput.virtualZ.current = -1
  page.window.dispatchEvent(new HarnessEvent('blur'))
  assert.equal(page.movementInput.keys.current.size, 0)
  assert.equal(page.movementInput.virtualX.current, 0)
  assert.equal(page.movementInput.virtualZ.current, 0)
  page.unmount()
})

test('actual movement hook removes captured listeners on unmount', () => {
  const page = mount()
  assert.ok(page.window.listeners.some(item => item.type === 'keydown' && item.capture))
  assert.ok(page.document.listeners.some(item => item.type === 'visibilitychange'))
  page.unmount()
  assert.equal(page.window.listeners.filter(item => item.type === 'keydown' && item.capture).length, 0)
  assert.equal(page.document.listeners.length, 0)
  page.key()
  assert.equal(page.returns, 0)
  assert.deepEqual(page.routerCalls, [])
})
