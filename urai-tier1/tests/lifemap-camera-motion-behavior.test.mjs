import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import * as cameraMotion from '../src/spatial/canon/cameraMotion.ts'
import { parseLifeMapCameraFrame } from '../src/components/lifemap/lifeMapCameraFrame.ts'

// Run the retained production stage and camera hooks; Three.js transforms and
// cameras are real. JSX children, rendering and browser events are controlled.
// These behavioral tests do not claim WebGL frame or visual-quality evidence.
function componentFixture(relative, exportName, threeState, initialProps, attach = () => {}) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8') + `\nexport { ${exportName} as motionTestOwner }\n`
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const slots = []
  let cursor = 0, queued = [], frameCallback, framePriority
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]))
  const effect = (callback, deps) => { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) { slots[index] = { deps }; queued.push(callback) } }
  const react = {
    useRef(value) { const index = cursor++; slots[index] ??= { value: { current: value } }; return slots[index].value },
    useMemo(callback, deps) { const index = cursor++; if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { deps, value: callback() }; return slots[index].value },
    useEffect: effect, useLayoutEffect: effect, createContext: () => ({ Provider: 'provider' }),
  }
  react.useCallback = (callback, deps) => react.useMemo(() => callback, deps)
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const imports = {
    react, three: THREE, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@react-three/fiber': { useThree: () => threeState, useFrame(callback, priority = 0) { frameCallback = callback; framePriority = priority } },
    '@react-three/drei': { useGLTF: { preload() {} } }, '@/spatial/canon/cameraMotion': cameraMotion,
    './lifeMapCameraFrame': { parseLifeMapCameraFrame },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, require(id) { return imports[id] ?? {} }, window: { addEventListener() {}, removeEventListener() {} }, URLSearchParams })
  const props = { ...initialProps }
  const render = (next = {}) => { Object.assign(props, next); cursor = 0; queued = []; const result = module.exports.motionTestOwner(props); attach(result); queued.forEach(callback => callback()); return result }
  render()
  return { render, step(delta) { frameCallback({ pointer: new THREE.Vector2() }, delta) }, priority: () => framePriority }
}

function find(tree, name) {
  if (!tree || typeof tree !== 'object') return null
  if (tree.props?.name === name) return tree
  const children = Array.isArray(tree.props?.children) ? tree.props.children : [tree.props?.children]
  for (const child of children.flat(Infinity)) { const result = find(child, name); if (result) return result }
  return null
}

function sceneFixture(portrait, reducedMotion = false) {
  const selected = { id: 'synthetic-selected-memory', position: [2, 1, -3], connectedTo: [] }
  const size = portrait ? { width: 390, height: 844 } : { width: 1440, height: 900 }
  const stage = new THREE.Group(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(46), shell = { dataset: {} }, settled = []
  stage.name = 'life-map-world-stage'
  scene.add(stage)
  let attached = false
  const world = componentFixture('../src/components/lifemap/LifeMapProductionWorld.tsx', 'LifeMapProductionWorld', { size }, { nodes: [selected], selected: null, phase: 'overview', profile: { tier: 'low', reducedMotion }, onSelect() {} }, tree => {
    const group = find(tree, 'life-map-world-stage')
    assert.ok(group)
    group.props.ref.current = stage
    if (!attached) { stage.scale.set(...group.props.scale); stage.position.set(...group.props.position); attached = true }
  })
  const rig = componentFixture('../src/components/lifemap/ComposedLifeMapScene.tsx', 'CameraRig', { size, scene, camera }, { selected: null, phase: 'overview', reducedMotion, shellRef: { current: shell }, entryFrame: null, onSettledChange: id => settled.push(id) })
  return { world, rig, stage, camera, selected, shell, settled, step(delta) { world.step(delta); rig.step(delta) } }
}

for (const portrait of [false, true]) for (const fps of [30, 60, 120]) {
  test(`actual ${portrait ? 'portrait' : 'desktop'} Life Map stage and camera at ${fps} Hz preserve acquisition continuity and only unlock after exact settling`, () => {
    const fixture = sceneFixture(portrait)
    fixture.step(1 / fps)
    const initialPosition = fixture.stage.position.clone(), initialScale = fixture.stage.scale.clone(), initialCamera = fixture.camera.position.clone()
    fixture.world.render({ selected: fixture.selected, phase: 'departure' })
    fixture.rig.render({ selected: fixture.selected, phase: 'departure' })
    assert.equal(fixture.stage.position.distanceTo(initialPosition), 0)
    assert.equal(fixture.stage.scale.distanceTo(initialScale), 0)
    assert.equal(fixture.camera.position.distanceTo(initialCamera), 0)
    assert.equal(fixture.world.priority(), -2)
    fixture.step(1 / fps)
    assert.equal(fixture.shell.dataset.lifeMapCameraSettled, 'false')
    assert.deepEqual(fixture.settled, [])
    for (const [phase, seconds] of [['departure', .28], ['travel', .72], ['approach', .82], ['arrival', 3]]) {
      fixture.world.render({ phase })
      fixture.rig.render({ phase })
      for (let frame = 0; frame < Math.ceil(fps * seconds); frame++) {
        fixture.step(1 / fps)
        const subject = new THREE.Vector3(...fixture.selected.position).applyMatrix4(fixture.stage.matrixWorld)
        assert.ok(Math.abs(Number(fixture.shell.dataset.lifeMapSelectedSubjectX) - subject.x) < 0.00006)
        assert.ok(Math.abs(Number(fixture.shell.dataset.lifeMapSelectedSubjectY) - subject.y) < 0.00006)
        assert.ok(Math.abs(Number(fixture.shell.dataset.lifeMapSelectedSubjectZ) - subject.z) < 0.00006)
        assert.ok(fixture.camera.position.toArray().every(Number.isFinite))
      }
    }
    assert.deepEqual(fixture.stage.scale.toArray(), portrait ? [0.92, 0.96, 0.92] : [1.12, 1.12, 1.08])
    assert.deepEqual(fixture.stage.position.toArray(), portrait ? [0, -0.08, 0.9] : [0, -0.16, 0.62])
    assert.equal(fixture.shell.dataset.lifeMapCameraSettled, 'true')
    assert.deepEqual(fixture.settled, [fixture.selected.id])
    const arrival = fixture.camera.position.clone(), orientation = fixture.camera.quaternion.clone(), fov = fixture.camera.fov
    for (let frame = 0; frame < fps; frame++) fixture.step(1 / fps)
    assert.equal(fixture.camera.position.distanceTo(arrival), 0)
    assert.deepEqual(fixture.camera.quaternion.toArray(), orientation.toArray())
    assert.equal(fixture.camera.fov, fov)
  })
}

test('actual reduced-motion Life Map skips path traversal while preserving selected target and readiness', () => {
  const fixture = sceneFixture(true, true)
  fixture.world.render({ selected: fixture.selected, phase: 'arrival' })
  fixture.rig.render({ selected: fixture.selected, phase: 'arrival' })
  fixture.step(1 / 60)
  assert.equal(fixture.shell.dataset.lifeMapCameraSettled, 'true')
  assert.deepEqual(fixture.settled, [fixture.selected.id])
  assert.deepEqual(fixture.stage.scale.toArray(), [0.92, 0.96, 0.92])
})

test('actual Life Map camera revokes readiness during context loss and reacquires the same settled selection', () => {
  const fixture = sceneFixture(false, true)
  fixture.world.render({ selected: fixture.selected, phase: 'arrival' })
  fixture.rig.render({ selected: fixture.selected, phase: 'arrival' })
  fixture.step(1 / 60)
  const before = fixture.camera.position.clone()
  fixture.rig.render({ active: false })
  fixture.step(1 / 60)
  assert.equal(fixture.shell.dataset.lifeMapCameraSettled, 'false')
  assert.deepEqual(fixture.settled, [fixture.selected.id, null])
  assert.equal(fixture.camera.position.distanceTo(before), 0)
  fixture.rig.render({ active: true })
  fixture.step(1 / 60)
  assert.equal(fixture.shell.dataset.lifeMapCameraSettled, 'true')
  assert.deepEqual(fixture.settled, [fixture.selected.id, null, fixture.selected.id])
})

test('actual Life Map return restores a validated original camera frame only for the bound selected identity', () => {
  const fixture = sceneFixture(false)
  const entryFrame = { targetId: fixture.selected.id, position: [7, 1, 6], target: [3, 0.1, -0.2], fov: 44 }
  fixture.rig.render({ selected: fixture.selected, phase: 'arrival', entryFrame })
  assert.deepEqual(fixture.camera.position.toArray(), entryFrame.position)
  assert.equal(fixture.camera.fov, entryFrame.fov)
  const expected = new THREE.PerspectiveCamera(44)
  expected.position.set(...entryFrame.position)
  expected.lookAt(new THREE.Vector3(...entryFrame.target))
  assert.deepEqual(fixture.camera.quaternion.toArray(), expected.quaternion.toArray())
  fixture.rig.render({ entryFrame: { ...entryFrame, targetId: 'unrelated-memory', position: [100, 0, 1] } })
  assert.deepEqual(fixture.camera.position.toArray(), entryFrame.position)
})
