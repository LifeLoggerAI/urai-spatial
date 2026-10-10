import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'
import { stepEmbodiedMotion, URAI_EMBODIED_MOVEMENT_INPUT_EVENT } from '../src/spatial/navigation/EmbodiedNavigation.tsx'
import { homeWalkSurfaceHeight, HOME_NAVIGATION_OBSTACLES, resolveHomeSolidPenetration } from '../src/spatial/layout/HomeSanctuaryGeometry.ts'
import { cameraDampingAlpha, cameraFrameDelta, dampCameraAngle } from '../src/spatial/canon/cameraMotion.ts'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const rigSource = source.slice(source.indexOf('function PlayerRig('), source.indexOf('\nfunction SceneReady('))
assert.ok(rigSource.startsWith('function PlayerRig('), 'exercise the active Home camera writer')
const compiled = ts.transpileModule(rigSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const landmark = name => {
  const args = source.match(new RegExp(`const ${name} = new THREE\\.Vector3\\(([^)]+)\\)`))?.[1]
  assert.ok(args, `actual Home landmark ${name} is required`)
  return new THREE.Vector3(...args.split(',').map(Number))
}

// Mount the production writer with real Three matrices and the actual shared
// motion/terrain kernels. Frame callbacks run under controlled elapsed time;
// this is numerical lifecycle evidence, not rendered visual acceptance.
function fixture({ yaw = 0, pitch = -.062, reducedMotion = false, width = 1440, height = 900 } = {}) {
  const camera = new THREE.PerspectiveCamera(50, width / height, .05, 300)
  const owner = { dataset: { homeAssetsReady: 'true' } }
  const state = { phase: 'HOME', inputLocked: false, setProgress(value) { state.progress = value } }
  const input = { keys: { current: new Set() }, virtualX: { current: 0 }, virtualZ: { current: 0 } }
  const props = { input, yaw: { current: yaw }, pitch: { current: pitch }, target: { current: null }, avatar: { current: null }, ascentProgress: { current: 0 }, groundDescent: false, reducedMotion, onNearby() {}, onGroundComplete: () => arrivals.push('ground'), onTransitionSequence: sequence => sequences.push(sequence), onRecoveryChange: value => { recovering = value } }
  const size = { width, height }
  const window = new EventTarget()
  const raf = new Map()
  let frame, framePriority, cursor = 0, clock = 0, recovering = false, invalidations = 0, rafId = 0
  const cells = [], effects = [], layouts = [], arrivals = [], sequences = []
  const hookEffect = queue => (operation, deps) => {
    const index = cursor++, previous = cells[index]
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
      queue.push(() => { previous?.cleanup?.(); cells[index] = { deps, cleanup: operation() } })
    }
  }
  Object.assign(window, { requestAnimationFrame: callback => { raf.set(++rafId, callback); return rafId }, cancelAnimationFrame: id => raf.delete(id) })
  const sandbox = {
    THREE, cameraDampingAlpha, cameraFrameDelta, dampCameraAngle,
    stepEmbodiedMotion, homeWalkSurfaceHeight, HOME_NAVIGATION_OBSTACLES, resolveHomeSolidPenetration, URAI_EMBODIED_MOVEMENT_INPUT_EVENT,
    HOME_BOUNDS: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 },
    SPAWN: landmark('SPAWN'), ORB: landmark('ORB'), GROUND_THRESHOLD: landmark('GROUND_THRESHOLD'), LIFE_MAP_LOOKOUT: landmark('LIFE_MAP_LOOKOUT'),
    ASCENT_DURATION_SECONDS: 3.4, GROUND_DESCENT_DURATION_SECONDS: 2.6,
    useThree: () => ({ camera, size, invalidate: () => invalidations++, gl: { domElement: { closest: () => owner } } }),
    useRef: initial => { const index = cursor++; cells[index] ??= { current: initial }; return cells[index] },
    useCallback: callback => { cursor++; return callback },
    useLayoutEffect: hookEffect(layouts), useEffect: hookEffect(effects), useFrame: (callback, priority) => { frame = callback; framePriority = priority },
    useSceneStore: { getState: () => state }, requestUraiWorldTravel: request => arrivals.push(request),
    document: { visibilityState: 'visible' }, window,
  }
  vm.createContext(sandbox)
  vm.runInContext(compiled, sandbox)
  const render = changes => {
    Object.assign(props, changes)
    cursor = 0
    sandbox.PlayerRig(props)
    while (layouts.length) layouts.shift()()
    while (effects.length) effects.shift()()
  }
  const step = delta => { clock += delta; frame({ clock: { elapsedTime: clock } }, delta); camera.updateMatrixWorld(true) }
  const run = (seconds, fps = 60) => { for (let i = 0; i < Math.round(seconds * fps); i++) step(1 / fps) }
  render()
  return { camera, owner, state, props, arrivals, sequences, size, render, step, run, get framePriority() { return framePriority }, get recovering() { return recovering }, get invalidations() { return invalidations }, unmount() { for (const cell of cells) cell?.cleanup?.(); assert.equal(raf.size, 0) } }
}

test('actual Home view and forward walking agree after turning in either direction', () => {
  for (const yaw of [-Math.PI / 2, -Math.PI / 3, Math.PI / 3, Math.PI / 2]) {
    const f = fixture({ yaw })
    f.run(2)
    const direction = f.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize()
    const before = f.camera.position.clone()
    f.props.input.keys.current.add('KeyW')
    f.run(.25)
    const movement = f.camera.position.clone().sub(before).setY(0).normalize()
    assert.ok(direction.dot(movement) > .999, `yaw=${yaw}: walking disagreed with the rendered camera matrix`)
    f.unmount()
  }
})

test('pointer pitch is a view angle and the rendered camera keeps an upright horizon', () => {
  const f = fixture({ yaw: Math.PI / 3, pitch: .35 })
  f.run(2)
  const direction = f.camera.getWorldDirection(new THREE.Vector3())
  assert.ok(Math.abs(direction.y - Math.sin(.35)) < .001)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(f.camera.quaternion)
  assert.ok(Math.abs(right.y) < 1e-7, 'manual look introduced camera roll')
  f.unmount()
})

test('Home camera remains above the actual solid-aware walk surface through acceleration and braking', () => {
  const f = fixture()
  f.props.input.keys.current.add('KeyW')
  for (let frame = 0; frame < 300; frame++) {
    if (frame === 200) f.props.input.keys.current.clear()
    f.step(1 / 60)
    const ground = homeWalkSurfaceHeight(f.camera.position.x, f.camera.position.z)
    assert.ok(f.camera.position.y - ground > 1.2, 'eye camera clipped the Home terrain')
    assert.ok(HOME_NAVIGATION_OBSTACLES.every(o => Math.hypot(f.camera.position.x - o.x, f.camera.position.z - o.z) >= o.radius - .0001), 'camera smoothing crossed a protected Home asset')
  }
  f.unmount()
})

test('actual Home preserves the shared collision substeps on foreground frames below 10 Hz', () => {
  const distances = []
  for (const fps of [5, 60]) {
    const f = fixture(), start = f.camera.position.clone()
    f.props.input.keys.current.add('KeyW')
    f.run(.8, fps)
    distances.push(f.camera.position.clone().sub(start).setY(0).length())
    f.unmount()
  }
  assert.ok(Math.abs(distances[0] - distances[1]) < 1e-7, `5Hz walking lost elapsed travel: ${distances}`)
})

test('Ascent departs from the actual manual pose with bounded initial acceleration', () => {
  const f = fixture({ yaw: -.4 })
  f.props.input.keys.current.add('KeyW')
  f.run(1)
  f.props.input.keys.current.clear()
  f.run(.6)
  const position = f.camera.position.clone(), quaternion = f.camera.quaternion.clone()
  f.state.phase = 'ASCENT'
  f.step(0)
  assert.equal(f.props.ascentProgress.current, 0, 'the Home atmosphere changed before any lift')
  assert.equal(f.framePriority, -1, 'the atmosphere must sample the same frame after its sole camera writer')
  assert.ok(f.camera.position.distanceTo(position) < 1e-8, 'Ascent changed the departure position before elapsed time')
  assert.ok(f.camera.quaternion.angleTo(quaternion) < 1e-7, 'Ascent snapped the departure orientation')
  f.step(1 / 60)
  assert.ok(f.camera.position.distanceTo(position) < .03, 'Ascent started at full travel velocity')
  f.unmount()
})

test('Ascent sampling and completion are identical at 30, 60 and 120 Hz', () => {
  const checkpoints = []
  for (const fps of [30, 60, 120]) {
    const f = fixture()
    f.state.phase = 'ASCENT'
    f.step(0)
    f.run(1.7, fps)
    assert.ok(Math.abs(f.props.ascentProgress.current - .5) < 1e-9)
    checkpoints.push({ position: f.camera.position.clone(), quaternion: f.camera.quaternion.clone() })
    f.run(1.7, fps)
    assert.equal(f.props.ascentProgress.current, 1, 'settled cosmic atmosphere did not reach its authored endpoint')
    assert.equal(f.arrivals.length, 1, `${fps}Hz did not complete exactly once at the authored 3.4 seconds`)
    assert.equal(f.arrivals[0].cameraCheckpoint, 'home-sky-ascent-complete')
    f.run(1, fps)
    assert.equal(f.arrivals.length, 1, 'settled Ascent triggered duplicated travel')
    f.unmount()
  }
  for (const pose of checkpoints.slice(1)) {
    assert.ok(pose.position.distanceTo(checkpoints[0].position) < 1e-7)
    assert.ok(pose.quaternion.angleTo(checkpoints[0].quaternion) < 1e-7)
  }
})

test('cancelled Ascent reverses to the saved Home pose without an orientation snap or residual walking', () => {
  const f = fixture({ yaw: -.8, pitch: .18 })
  f.run(.5)
  const homePosition = f.camera.position.clone(), homeQuaternion = f.camera.quaternion.clone()
  f.state.phase = 'ASCENT'
  f.step(0)
  f.run(1)
  const interruptedPosition = f.camera.position.clone(), interruptedQuaternion = f.camera.quaternion.clone()
  const interruptedAtmosphere = f.props.ascentProgress.current
  f.props.input.keys.current.add('KeyW') // stale held input must not take ownership on cancellation
  f.state.phase = 'HOME'
  f.step(0)
  assert.equal(f.props.ascentProgress.current, interruptedAtmosphere, 'ESC snapped the atmosphere back before camera recovery')
  assert.ok(f.camera.position.distanceTo(interruptedPosition) < 1e-8)
  assert.ok(f.camera.quaternion.angleTo(interruptedQuaternion) < 1e-7, 'ESC snapped the camera look before recovery')
  assert.equal(f.recovering, true)
  f.run(.2)
  assert.ok(f.props.ascentProgress.current > 0 && f.props.ascentProgress.current < interruptedAtmosphere, 'ESC did not reverse the atmosphere with the travelled path')
  f.run(1.2)
  assert.equal(f.props.ascentProgress.current, 0, 'recovery lost the original Home atmosphere')
  assert.equal(f.recovering, false)
  assert.ok(f.camera.position.distanceTo(homePosition) < .001, 'ESC lost the last Home position')
  assert.ok(f.camera.quaternion.angleTo(homeQuaternion) < .001, 'ESC lost the last Home orientation')
  assert.equal(f.props.input.keys.current.size, 0)
  f.unmount()
})

test('reduced-motion Ascent preserves the departure camera while completing the same destination', () => {
  const f = fixture({ reducedMotion: true })
  const position = f.camera.position.clone(), quaternion = f.camera.quaternion.clone()
  f.state.phase = 'ASCENT'
  f.step(0)
  f.run(.5)
  assert.equal(f.props.ascentProgress.current, 0, 'reduced motion changed the held departure atmosphere')
  assert.ok(f.camera.position.distanceTo(position) < 1e-8, 'reduced motion performed rapid long-distance travel')
  assert.ok(f.camera.quaternion.angleTo(quaternion) < 1e-7, 'reduced motion performed a cinematic rotation')
  assert.equal(f.arrivals.length, 1)
  assert.equal(f.arrivals[0].destination, 'life-map')
  f.unmount()
})

test('viewport changes during Ascent cannot rerun Home placement or background time skip the journey', () => {
  const f = fixture()
  f.state.phase = 'ASCENT'
  f.step(0)
  f.run(1)
  const position = f.camera.position.clone(), quaternion = f.camera.quaternion.clone()
  f.size.width = 390; f.size.height = 844; f.render()
  assert.ok(f.camera.position.distanceTo(position) < 1e-8, 'viewport resize reset an active cinematic camera')
  assert.ok(f.camera.quaternion.angleTo(quaternion) < 1e-7)
  f.step(30)
  assert.equal(f.arrivals.length, 0, 'background elapsed time skipped Ascent')
  f.camera.fov = 58
  f.step(0)
  assert.equal(Number(f.owner.dataset.homeCameraFov), f.camera.fov, 'pose evidence did not publish the real PerspectiveCamera framing')
  f.unmount()
})

test('Ground departure and cancellation use the same sole writer and restore the actual Home pose', () => {
  const f = fixture({ yaw: .65, pitch: -.12 })
  f.run(.5)
  const homePosition = f.camera.position.clone(), homeQuaternion = f.camera.quaternion.clone()
  f.render({ groundDescent: true }); f.step(0)
  assert.ok(f.camera.position.distanceTo(homePosition) < 1e-8)
  assert.ok(f.camera.quaternion.angleTo(homeQuaternion) < 1e-7)
  f.run(.6)
  assert.equal(f.props.ascentProgress.current, 0, 'Ground descent acquired the cosmic sky')
  assert.equal(f.owner.dataset.homeCameraOwner, 'home-ground-descent')
  const interrupted = f.camera.position.clone()
  f.render({ groundDescent: false }); f.step(0)
  assert.ok(f.camera.position.distanceTo(interrupted) < 1e-8)
  f.run(.8)
  assert.equal(f.arrivals.length, 0, 'cancelled Ground descent issued travel')
  assert.ok(f.camera.position.distanceTo(homePosition) < .001)
  assert.ok(f.camera.quaternion.angleTo(homeQuaternion) < .001)
  f.render({ groundDescent: true }); f.step(0); f.run(2.6)
  assert.deepEqual(f.arrivals, ['ground'])
  f.run(1)
  assert.equal(f.arrivals.length, 1)
  f.unmount()
})

test('invalid frame time cannot corrupt the active Home camera or skip cinematic ownership', () => {
  const f = fixture()
  f.state.phase = 'ASCENT'; f.step(0)
  const before = f.camera.position.clone(), quaternion = f.camera.quaternion.clone()
  for (const delta of [NaN, Infinity, -1, 0]) {
    f.step(delta)
    assert.ok(f.camera.position.distanceTo(before) < 1e-8)
    assert.ok(f.camera.quaternion.angleTo(quaternion) < 1e-7)
    assert.equal(f.owner.dataset.homeCameraFrameDelta, '0.000000')
  }
  assert.equal(f.arrivals.length, 0)
  f.unmount()
})
