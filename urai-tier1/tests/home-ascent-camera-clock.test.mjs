import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('HomeWorldProductionPolished.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const constants = ['SPAWN', 'ORB', 'GROUND_THRESHOLD', 'LIFE_MAP_LOOKOUT', 'HOME_BOUNDS', 'ASCENT_DURATION_SECONDS', 'GROUND_DESCENT_DURATION_SECONDS']
const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PlayerRig'
  || ts.isVariableStatement(node) && node.declarationList.declarations.some(item => constants.includes(item.name.getText(ast))))
assert.equal(declarations.filter(node => ts.isFunctionDeclaration(node)).length, 1)
const code = ts.transpileModule(declarations.map(node => node.getText(ast)).join('\n') + '\nexports.PlayerRig = PlayerRig', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function rig(reducedMotion = false) {
  const camera = new THREE.PerspectiveCamera(), travels = [], sequences = []
  const state = { phase: 'ASCENT', progress: 0, setProgress(value) { state.progress = value } }
  let frame
  const output = {}
  vm.runInNewContext(code, {
    exports: output, THREE,
    useThree: () => ({ camera, size: { width: 1440, height: 900 }, invalidate() {}, gl: { domElement: { closest: () => null } } }),
    useRef: current => ({ current }), useCallback: callback => callback, useLayoutEffect: callback => callback(), useEffect() {},
    useFrame: callback => { frame = callback }, useSceneStore: { getState: () => state },
    homeWalkSurfaceHeight: () => 0, stepEmbodiedMotion() {}, resolveHomeSolidPenetration() {}, HOME_NAVIGATION_OBSTACLES: [],
    requestUraiWorldTravel: request => travels.push(JSON.parse(JSON.stringify(request))),
  })
  output.PlayerRig({ input: { keys: { current: new Set() }, virtualX: { current: 0 }, virtualZ: { current: 0 } },
    yaw: { current: .055 }, pitch: { current: -.04 }, target: { current: null }, avatar: { current: null },
    onNearby() {}, groundDescent: false, reducedMotion, onGroundComplete() {}, onTransitionSequence: value => sequences.push(value) })
  return { camera, state, travels, sequences, tick: (elapsedTime, delta) => frame({ clock: { elapsedTime } }, delta) }
}
const near = (actual, expected) => assert.ok(actual.distanceTo(expected) < 1e-9, `${actual.toArray()} != ${expected.toArray()}`)

test('first ascent frame retains its entry position even after a long previous frame', () => {
  const r = rig(), start = r.camera.position.clone()
  r.tick(10, 9)
  near(r.camera.position, start)
  assert.equal(r.state.progress, 0)
  assert.equal(r.travels.length, 0)
})

test('same elapsed ascent position is independent of frame partition', () => {
  const regular = rig(), delayed = rig(), start = regular.camera.position.clone()
  regular.tick(0, .016); delayed.tick(0, .4)
  for (let n = 1; n <= 102; n++) regular.tick(n / 60, 1 / 60)
  delayed.tick(.1, .1); delayed.tick(1.7, 1.6)
  near(regular.camera.position, delayed.camera.position)
  near(delayed.camera.position, start.clone().add(new THREE.Vector3(0, 44, -54)).multiplyScalar(.5))
  assert.equal(delayed.state.progress, .5)
})

test('normal ascent retains its duration, endpoint and exactly one canonical admission', () => {
  const r = rig()
  r.tick(0, 5); r.tick(3.399, 3.399)
  assert.equal(r.travels.length, 0)
  r.tick(3.4, .001); r.tick(4, .6)
  near(r.camera.position, new THREE.Vector3(0, 44, -54))
  assert.deepEqual(r.travels, [{ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }])
})

test('reduced motion retains the existing .42-second duration', () => {
  const r = rig(true), start = r.camera.position.clone()
  r.tick(0, 5); r.tick(.21, .21)
  near(r.camera.position, start.clone().add(new THREE.Vector3(0, 44, -54)).multiplyScalar(.5))
  assert.equal(r.travels.length, 0)
  r.tick(.42, .21)
  near(r.camera.position, new THREE.Vector3(0, 44, -54))
  assert.equal(r.travels.length, 1)
})

test('cancel and reentry recapture the current camera and restart admission time', () => {
  const r = rig()
  r.tick(0, 0); r.tick(1.7, 1.7)
  r.state.phase = 'HOME'; r.tick(2, .3)
  r.camera.position.set(2, 3, 4)
  r.state.phase = 'ASCENT'; r.tick(20, 18)
  near(r.camera.position, new THREE.Vector3(2, 3, 4))
  assert.equal(r.state.progress, 0)
  assert.equal(r.travels.length, 0)
  r.tick(21.7, 1.7)
  near(r.camera.position, new THREE.Vector3(1, 23.5, -25))
})

test('position cannot outrun the existing look target and reverse its forward direction', () => {
  const r = rig(), direction = new THREE.Vector3()
  r.tick(0, .2)
  for (let n = 0; n <= 34; n++) {
    r.tick(n / 10, .1)
    r.camera.getWorldDirection(direction)
    assert.ok(direction.z < 0, `unexpected backward turn at ${n / 10}s`)
  }
})
