import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import * as cameraMotion from '../src/spatial/canon/cameraMotion.ts'
import * as frames from '../src/app/focus/focusCameraFrame.ts'
import { parseLifeMapCameraFrame, retainLifeMapCameraFrame } from '../src/components/lifemap/lifeMapCameraFrame.ts'

const starId = 'synthetic-chosen-star'
const mapParams = new URLSearchParams({ cameraCheckpoint: `life-map-arrival:${starId}`, entryCamera: '7,1,6', entryTarget: '3,0.1,-0.2', entryFov: '44' })
const entryFrame = frames.parseEntryCameraFrame(mapParams, starId)

test('Life Map framing rebases around the same Focus photosphere without changing view direction, distance or FOV', () => {
  assert.ok(entryFrame)
  assert.deepEqual(entryFrame.target, frames.FOCUS_MEMORY_ORIGIN)
  const incomingDirection = new THREE.Vector3(3, 0.1, -0.2).sub(new THREE.Vector3(7, 1, 6))
  const focusedDirection = new THREE.Vector3(...entryFrame.target).sub(new THREE.Vector3(...entryFrame.position))
  assert.ok(incomingDirection.distanceTo(focusedDirection) < 1e-12)
  assert.equal(entryFrame.fov, 44)
  assert.deepEqual([...mapParams.entries()], [...new URLSearchParams({ cameraCheckpoint: `life-map-arrival:${starId}`, entryCamera: '7,1,6', entryTarget: '3,0.1,-0.2', entryFov: '44' }).entries()])
})

test('checkpoint admission rejects another target, empty coordinates and unbounded or nonfinite frames', () => {
  assert.equal(frames.parseEntryCameraFrame(mapParams, 'another-star'), null)
  for (const value of ['1,,3', '1,NaN,3', '1,Infinity,3', '1000000,1,3', '1,2,3,4']) {
    const invalid = new URLSearchParams(mapParams)
    invalid.set('entryCamera', value)
    assert.equal(frames.parseEntryCameraFrame(invalid, starId), null, value)
  }
  for (const value of ['', '0', 'NaN', 'Infinity', '170']) {
    const invalid = new URLSearchParams(mapParams)
    invalid.set('entryFov', value)
    assert.equal(frames.parseEntryCameraFrame(invalid, starId), null, value)
  }
  assert.equal(frames.entryCameraFrameMatchesMemory(entryFrame, { id: 'another-memory', star: { id: 'another-star' } }), false)
  assert.equal(frames.entryCameraFrameMatchesMemory(entryFrame, { id: starId, star: { id: 'distinct-owned-star' } }), true)
})

test('legal orbit poses outside keyboard clamps survive Replay transport and the same-star Focus return', () => {
  const pose = { position: [-10, 0.5, -1.3], target: [0, 0.45, -1.3], fov: 48 }
  const next = new URLSearchParams()
  assert.equal(frames.appendFocusCameraFrame(next, { focusCameraX: '-10', focusCameraY: '.5', focusCameraZ: '-1.3', focusTargetX: '0', focusTargetY: '.45', focusTargetZ: '-1.3', focusFov: '48' }, starId), true)
  assert.deepEqual(frames.parseFocusCameraFrame(next, starId, 'focus'), pose)
  next.set('cameraCheckpoint', `focus-return:${starId}`)
  const returned = frames.parseEntryCameraFrame(next, starId)
  assert.deepEqual(returned, { ...pose, source: 'focus-return', targetId: starId })
  assert.equal(frames.parseEntryCameraFrame(next, 'another-star'), null)
})

test('original Life Map coordinates and original target survive alongside a distinct local Focus pose', () => {
  const next = new URLSearchParams({ memoryId: starId, node: 'distinct-owned-star' })
  assert.equal(retainLifeMapCameraFrame(next, mapParams, starId), true)
  frames.appendFocusCameraFrame(next, { focusCameraX: '0', focusCameraY: '1.45', focusCameraZ: '8.2', focusTargetX: '0', focusTargetY: '.45', focusTargetZ: '-1.3', focusFov: '48' }, 'distinct-owned-star')
  assert.equal(next.get('returnNode'), starId)
  assert.equal(next.get('lifeMapCamera'), '7,1,6')
  assert.equal(next.get('entryCamera'), '0,1.45,8.2')
  const secondReplay = new URLSearchParams()
  assert.equal(retainLifeMapCameraFrame(secondReplay, next, starId), true)
  assert.equal(retainLifeMapCameraFrame(new URLSearchParams(), next, 'unrelated-target'), false)
  const returnedMap = new URLSearchParams({ cameraCheckpoint: `life-map-return:${starId}`, entryCamera: next.get('lifeMapCamera'), entryTarget: next.get('lifeMapTarget'), entryFov: next.get('lifeMapFov') })
  assert.deepEqual(parseLifeMapCameraFrame(returnedMap, starId, 'return'), { targetId: starId, position: [7, 1, 6], target: [3, 0.1, -0.2], fov: 44 })
  assert.equal(parseLifeMapCameraFrame(returnedMap, 'another-target', 'return'), null)
})

// Execute the actual FocusCameraRig with its real Three.js camera and controlled
// hook/frame/input edges. This verifies production motion behavior without
// claiming WebGL rendering or substituting a copy of the camera algorithm.
const source = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8') + '\nexport { FocusCameraRig }\n'
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText

function cameraFixture(initial = {}) {
  const camera = new THREE.PerspectiveCamera(48)
  camera.position.set(0, 1.45, 8.2)
  const listeners = new Map(), readiness = [], controlsCalls = [], slots = []
  let cursor = 0, frameCallback, layouts = [], effects = [], rig
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const effectHook = queue => (callback, deps) => {
    const index = cursor++, previous = slots[index]
    if (!previous || changed(previous.deps, deps)) {
      slots[index] = { deps, cleanup: previous?.cleanup }
      queue.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback() })
    }
  }
  const react = {
    useRef(value) { const index = cursor++; slots[index] ??= { value: { current: value } }; return slots[index].value },
    useMemo(callback, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: callback(), deps }; return slots[index].value },
    useLayoutEffect(callback, deps) { effectHook(layouts)(callback, deps) },
    useEffect(callback, deps) { effectHook(effects)(callback, deps) },
  }
  react.useCallback = (callback, deps) => react.useMemo(() => callback, deps)
  const controls = { target: new THREE.Vector3(0, 0.45, -1.3), enabled: true, enableDamping: true,
    update() { controlsCalls.push({ enabled: this.enabled, damping: this.enableDamping }); camera.lookAt(this.target) },
  }
  const props = { controls: { current: controls }, shellRef: { current: { dataset: {} } }, entryFrame, recenterSignal: 0, reducedMotion: false, active: true, onInputReadyChange: ready => readiness.push(ready), ...initial }
  const imports = {
    react, three: THREE, 'react/jsx-runtime': { jsx() {}, jsxs() {} },
    '@react-three/fiber': { useThree: () => ({ camera }), useFrame(callback) { frameCallback = callback } },
    '@react-three/drei': {}, '@/spatial/canon/cameraMotion': cameraMotion, './focusCameraFrame': frames,
    '@/components/lifemap/lifeMapCameraFrame': { retainLifeMapCameraFrame },
  }
  const module = { exports: {} }
  const browser = { addEventListener(type, handler) { listeners.set(type, handler) }, removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type) } }
  vm.runInNewContext(compiled, { module, exports: module.exports, require(id) { return imports[id] ?? {} }, window: browser, URLSearchParams, Element: class {}, document: { body: { style: {} } } })
  rig = module.exports.FocusCameraRig
  function render(next = {}) { Object.assign(props, next); cursor = 0; layouts = []; effects = []; rig(props); layouts.forEach(callback => callback()); effects.forEach(callback => callback()) }
  render()
  return { camera, controls, controlsCalls, readiness, shell: props.shellRef.current, render,
    step(delta) { frameCallback({}, delta) },
    key(type, code) { let prevented = false; listeners.get(type)?.({ code, defaultPrevented: false, target: null, preventDefault() { prevented = true } }); return prevented },
    teardown() { slots.forEach(slot => slot.cleanup?.()) },
    listenerCount() { return listeners.size },
  }
}

for (const fps of [30, 60, 120]) {
  test(`actual Focus rig at ${fps} Hz holds input through finite arrival, then stops all cinematic drift`, () => {
    const fixture = cameraFixture()
    assert.deepEqual(fixture.camera.position.toArray(), entryFrame.position)
    assert.equal(fixture.controls.enabled, false)
    assert.equal(fixture.controls.enableDamping, false)
    assert.equal(fixture.key('keydown', 'KeyW'), false)
    fixture.step(1 / fps)
    assert.equal(fixture.shell.dataset.focusInputReady, 'false')
    assert.ok(fixture.controlsCalls.every(call => !call.enabled && !call.damping))
    for (let frame = 0; frame < fps * 4; frame++) fixture.step(1 / fps)
    assert.deepEqual(fixture.camera.position.toArray(), [0, 1.45, 8.2])
    assert.deepEqual(fixture.controls.target.toArray(), [0, 0.45, -1.3])
    assert.equal(fixture.camera.fov, 48)
    assert.equal(fixture.shell.dataset.focusCameraSettled, 'true')
    assert.deepEqual(fixture.readiness, [false, true])
    const settled = fixture.camera.position.clone()
    for (let frame = 0; frame < fps; frame++) fixture.step(1 / fps)
    assert.equal(fixture.camera.position.distanceTo(settled), 0)
    assert.equal(fixture.key('keydown', 'KeyW'), true)
    fixture.step(1 / fps)
    assert.ok(fixture.camera.position.distanceTo(settled) > 0)
    fixture.key('keyup', 'KeyW')
    const manual = fixture.camera.position.clone()
    for (let frame = 0; frame < fps; frame++) fixture.step(1 / fps)
    assert.equal(fixture.camera.position.distanceTo(manual), 0)
    fixture.teardown()
    assert.equal(fixture.listenerCount(), 0)
    assert.equal(fixture.shell.dataset.focusInputReady, 'false')
  })
}

test('actual Focus return restores user pose exactly with two admitted frames and no canonical camera drift', () => {
  const returned = { source: 'focus-return', targetId: starId, position: [-10, 0.5, -1.3], target: [0, 0.45, -1.3], fov: 48 }
  for (const reducedMotion of [false, true]) {
    const fixture = cameraFixture({ entryFrame: returned, reducedMotion })
    fixture.step(1 / 60)
    assert.equal(fixture.controls.enabled, false)
    for (let frame = 0; frame < 120; frame++) fixture.step(1 / 60)
    assert.deepEqual(fixture.camera.position.toArray(), returned.position)
    assert.deepEqual(fixture.controls.target.toArray(), returned.target)
    assert.equal(fixture.controls.enabled, true)
    fixture.teardown()
  }
})

test('actual Focus reduced motion settles directly without traversing the Life Map camera path', () => {
  const fixture = cameraFixture({ reducedMotion: true })
  const first = fixture.camera.position.clone()
  fixture.step(1 / 60)
  fixture.step(1 / 60)
  assert.deepEqual(first.toArray(), [0, 1.45, 8.2])
  assert.equal(fixture.camera.position.distanceTo(first), 0)
  assert.equal(fixture.controls.enabled, true)
  assert.equal(fixture.controls.enableDamping, false)
  fixture.teardown()
})

test('actual Focus rig freezes input and camera when Replay takes ownership, then restores safe input without drift', () => {
  const fixture = cameraFixture()
  for (let frame = 0; frame < 240; frame++) fixture.step(1 / 60)
  fixture.key('keydown', 'KeyW')
  fixture.render({ active: false })
  const suspended = fixture.camera.position.clone()
  fixture.step(0.1)
  assert.equal(fixture.controls.enabled, false)
  assert.equal(fixture.camera.position.distanceTo(suspended), 0)
  assert.equal(fixture.key('keydown', 'KeyW'), false)
  fixture.render({ active: true })
  fixture.step(1 / 60)
  fixture.step(1 / 60)
  assert.equal(fixture.controls.enabled, true)
  assert.equal(fixture.camera.position.distanceTo(suspended), 0)
  fixture.teardown()
})

test('actual Focus recenter preserves the starting frame and blends to an exact stable pose', () => {
  const fixture = cameraFixture({ entryFrame: null })
  fixture.step(1 / 60)
  fixture.step(1 / 60)
  fixture.camera.position.set(3, 2, 9)
  const start = fixture.camera.position.clone()
  fixture.render({ recenterSignal: 1 })
  assert.equal(fixture.camera.position.distanceTo(start), 0)
  assert.equal(fixture.controls.enabled, false)
  for (let frame = 0; frame < 240; frame++) fixture.step(1 / 60)
  assert.deepEqual(fixture.camera.position.toArray(), [0, 1.45, 8.2])
  fixture.teardown()
})

test('actual Focus action waits for camera/render readiness, ignores duplicate Replay triggers and recovers after world cancellation', () => {
  const slots = [], requests = [], runtime = { world: { destination: 'focus' }, phase: 'idle', pendingTravel: undefined }
  const memory = { id: 'synthetic-memory', ownerId: 'synthetic-owner', star: { id: starId }, replayManifest: { id: 'synthetic-manifest' }, title: 'Disclosed synthetic fixture', narrator: { focus: 'Synthetic test only' }, visuals: { sky: '#000', ground: '#000' }, privacy: 'private', people: [], sourceMedia: [], demo: true }
  let cursor = 0, dirty = false, layouts = [], effects = []
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const effect = queue => (callback, deps) => { const index = cursor++, previous = slots[index]; if (!previous || changed(previous.deps, deps)) { slots[index] = { deps, cleanup: previous?.cleanup }; queue.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback() }) } }
  const react = {
    useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, next => { const value = typeof next === 'function' ? next(slots[index].value) : next; if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true } }] },
    useRef(value) { const index = cursor++; slots[index] ??= { value: { current: value } }; return slots[index].value },
    useMemo(callback, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: callback(), deps }; return slots[index].value },
    useLayoutEffect(callback, deps) { effect(layouts)(callback, deps) }, useEffect(callback, deps) { effect(effects)(callback, deps) },
  }
  react.useCallback = (callback, deps) => react.useMemo(() => callback, deps)
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const imports = {
    react, three: THREE, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/spatial/canon/cameraMotion': cameraMotion, './focusCameraFrame': frames, '@/components/lifemap/lifeMapCameraFrame': { retainLifeMapCameraFrame },
    '@/lib/i18n/useUraiLocale': { useUraiLocale: () => ({ locale: 'en', text: value => value, props: () => ({}), date: value => value }) },
    '@/spatial/memory/useSelectedMemory': { useSelectedMemory: () => ({ status: 'demo', memory }) },
    '@/spatial/performance/useAdaptiveSpatialQuality': { useAdaptiveSpatialQuality: () => ({ tier: 'low', reducedMotion: false, documentVisible: true }) },
    '@/spatial/assets/uraiAssets': { assetCssStack: () => '', focusAssets: { primary: { src: '/synthetic.webp' } }, replayAssets: { primary: { src: '/synthetic.webp' } } },
    './focusMemoryAppearance': { focusMemoryAppearance: () => ({ accent: '#fff', light: '#fff', imageUrl: null }) },
    '@/spatial/world/WorldStateProvider': { useUraiWorldState: () => runtime },
    '@/spatial/world/worldEvents': { requestUraiWorldTravel(request) { requests.push(request); runtime.phase = 'travelling'; runtime.pendingTravel = request }, requestUraiWorldReturn() {} },
  }
  const module = { exports: {} }, shell = { dataset: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require(id) { return imports[id] ?? {} }, URLSearchParams,
    window: { location: { search: `?demo=1&memoryId=${memory.id}&node=${starId}` }, addEventListener() {}, removeEventListener() {} },
    document: { body: { style: {} }, createElement: () => ({ getContext: () => ({}) }), querySelector: () => null },
  })
  const descendants = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...(Array.isArray(tree.props?.children) ? tree.props.children.flat(Infinity) : [tree.props?.children]).flatMap(descendants)]
  const render = () => {
    for (let iteration = 0; iteration < 20; iteration++) {
      cursor = 0; dirty = false; layouts = []; effects = []
      const tree = module.exports.default()
      tree.props.ref.current = shell
      layouts.forEach(callback => callback()); effects.forEach(callback => callback())
      if (!dirty) return descendants(tree)
    }
    throw Error('Focus did not settle its React state')
  }
  let tree = render()
  const action = () => tree.find(element => element.type === 'button' && element.props.className === 'primary')
  assert.equal(action().props.disabled, true)
  action().props.onClick()
  assert.equal(requests.length, 0)
  const scene = tree.find(element => element.type?.name === 'FocusScene')
  assert.ok(scene)
  scene.props.onInputReadyChange(true)
  scene.props.onFirstFrame()
  tree = render()
  assert.equal(action().props.disabled, false)
  action().props.onClick()
  action().props.onClick()
  assert.equal(requests.length, 1)
  tree = render()
  assert.equal(action().props.disabled, true)
  assert.equal(tree.find(element => element.type?.name === 'FocusScene').props.active, false)
  runtime.phase = 'idle'; runtime.pendingTravel = undefined
  tree = render()
  assert.equal(action().props.disabled, false)
  assert.equal(tree.find(element => element.type?.name === 'FocusScene').props.active, true)
  action().props.onClick()
  assert.equal(requests.length, 2)
  assert.ok(requests.every(request => new URLSearchParams(request.href.split('?')[1]).get('memoryId') === memory.id))
})
