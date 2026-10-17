import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import * as Three from 'three'

const runtimeUrl = new URL('../src/app/spatial/ar-vr/xrEntryWorldRuntime.ts', import.meta.url)

test('XR canvas drag resets after pointer cancellation, capture loss and blur', async () => {
  const source = await readFile(runtimeUrl, 'utf8')

  assert.match(source, /cancelPointerDrag/)
  assert.match(source, /hasPointerCapture/)
  assert.match(source, /addEventListener\('pointercancel'/)
  assert.match(source, /addEventListener\('lostpointercapture'/)
  assert.match(source, /addEventListener\('blur', this\.windowBlur\)/)
  assert.match(source, /removeEventListener\('pointercancel'/)
  assert.match(source, /removeEventListener\('lostpointercapture'/)
  assert.match(source, /removeEventListener\('blur', this\.windowBlur\)/)
})

async function runtimeHarness({ reducedMotion = false, mobile = false } = {}) {
  const events = new Map()
  const domElement = { setAttribute() {}, addEventListener() {}, removeEventListener() {}, remove() {} }
  class Renderer {
    shadowMap = {}
    domElement = domElement
    info = { render: { calls: 37, triangles: 24000 }, memory: { geometries: 22, textures: 3 } }
    xr = { isPresenting: false, getController: () => new Three.Group() }
    setAnimationLoop(callback) { this.tick = callback }
    setPixelRatio(value) { this.dpr = value }
    getPixelRatio() { return this.dpr }
    setSize() {}
    render() {}
    dispose() { this.disposed = true }
  }
  const window = {
    devicePixelRatio: 3,
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener: (type, listener) => events.set(type, listener),
    removeEventListener: (type, listener) => { if (events.get(type) === listener) events.delete(type) },
    dispatchEvent: event => { events.get(event.type)?.(event) },
  }
  const { outputText } = ts.transpileModule(await readFile(runtimeUrl, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: specifier => { assert.equal(specifier, 'three'); return { ...Three, WebGLRenderer: Renderer } },
    window, navigator: { userAgent: mobile ? 'OculusBrowser Quest' : 'Desktop' }, performance: { now: () => 0 },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
  })
  const runtime = new module.exports.UraiXrWorldRuntime({ clientWidth: 800, clientHeight: 600, appendChild() {} }, () => {}, () => {})
  return { runtime, events }
}

test('XR diagonal movement remains on the circular chamber floor and recenter restores spawn', async () => {
  const { runtime } = await runtimeHarness()
  try {
    runtime.setKey('KeyW', true); runtime.setKey('KeyD', true)
    for (let frame = 1; frame <= 600; frame++) runtime.renderer.tick(frame * 50)
    assert.ok(Math.hypot(runtime.rig.position.x, runtime.rig.position.z) <= 10.12 + 1e-9)
    assert.ok(Math.hypot(runtime.rig.position.x, runtime.rig.position.z + 0.7) >= 2.18 - 1e-9)
    runtime.recenter()
    assert.equal(runtime.rig.position.x, 0)
    assert.equal(runtime.rig.position.z, 5.8)
    assert.equal(runtime.rig.rotation.y, 0)
  } finally { runtime.dispose() }
})

test('XR system reduced motion applies at startup and pauses automatic decorations', async () => {
  const { runtime } = await runtimeHarness({ reducedMotion: true })
  try {
    const orb = runtime.scene.children.find(item => item.userData.baseY !== undefined)
    assert.equal(runtime.reducedMotion, true)
    const rotation = orb.rotation.y
    for (let frame = 1; frame <= 20; frame++) runtime.renderer.tick(frame * 16)
    assert.equal(orb.position.y, orb.userData.baseY)
    assert.equal(orb.rotation.y, rotation)
    runtime.reducedMotion = false
    runtime.renderer.tick(400)
    assert.notEqual(orb.rotation.y, rotation)
  } finally { runtime.dispose() }
})

test('XR held turn input snaps once and must return to neutral before another turn', async () => {
  const { runtime } = await runtimeHarness()
  try {
    runtime.renderer.xr.isPresenting = true
    const axes = [0, 0, 1, 0]
    runtime.session = { inputSources: [{ gamepad: { axes } }] }
    runtime.renderer.tick(10)
    const turned = runtime.rig.rotation.y
    assert.ok(Math.abs(turned + Math.PI / 6) < 1e-9)
    runtime.renderer.tick(20)
    assert.equal(runtime.rig.rotation.y, turned)
    axes[2] = 0; runtime.renderer.tick(30)
    axes[2] = -1; runtime.renderer.tick(40)
    assert.ok(Math.abs(runtime.rig.rotation.y) < 1e-9)
  } finally { runtime.dispose() }
})

test('XR frame instrumentation is bounded and reports active cadence plus renderer counters without device claims', async () => {
  const { runtime, events } = await runtimeHarness({ mobile: true })
  try {
    for (let frame = 1; frame <= 800; frame++) runtime.renderer.tick(frame * 20)
    let snapshot = runtime.getPerformanceSnapshot()
    assert.equal(snapshot.sampleCount, 600)
    assert.equal(snapshot.qualityTier, 'quest-mobile')
    assert.equal(snapshot.pixelRatio, 1.25)
    assert.equal(snapshot.frameIntervalP95Ms, 20)
    assert.equal(snapshot.physicalDeviceAccepted, false)
    assert.equal(snapshot.drawCalls, 37)
    assert.equal(snapshot.triangles, 24000)
    runtime.renderer.xr.isPresenting = true
    runtime.session = { frameRate: 90, inputSources: [] }
    runtime.renderer.tick(16020)
    runtime.renderer.tick(16050)
    snapshot = runtime.getPerformanceSnapshot()
    assert.equal(snapshot.sampleCount, 1)
    assert.equal(snapshot.targetFrameRate, 90)
    assert.equal(snapshot.framesOverBudget, 1)
    assert.equal(snapshot.immersive, true)
    assert.ok(events.has('urai:xr-performance-request'))
  } finally { runtime.dispose() }
  assert.equal(events.has('urai:xr-performance-request'), false)
})

test('XR teleport and walking share the radial and dais boundaries, and blur cancels held movement', async () => {
  const { runtime, events } = await runtimeHarness()
  try {
    const controller = runtime.rig.children.find(item => item instanceof Three.Group)
    controller.rotation.x = -Math.PI / 2
    controller.position.set(8, 2, 8 - runtime.rig.position.z)
    runtime.scene.updateMatrixWorld(true)
    controller.dispatchEvent({ type: 'select' })
    assert.ok(Math.abs(Math.hypot(runtime.rig.position.x, runtime.rig.position.z) - 10.12) < 1e-9)
    controller.position.set(-runtime.rig.position.x, 2, -0.7 - runtime.rig.position.z)
    runtime.scene.updateMatrixWorld(true)
    controller.dispatchEvent({ type: 'select' })
    assert.ok(Math.abs(Math.hypot(runtime.rig.position.x, runtime.rig.position.z + 0.7) - 2.18) < 1e-9)
    runtime.setKey('KeyW', true)
    events.get('blur')()
    const position = runtime.rig.position.clone()
    runtime.renderer.tick(100)
    assert.deepEqual(runtime.rig.position.toArray(), position.toArray())
    assert.equal(runtime.keys.size, 0)
  } finally { runtime.dispose() }
})
