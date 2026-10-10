import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { getFocusFrame } from '../src/app/focus/focusComposition.ts'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const sourceUrl = new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url)
const source = ts.createSourceFile(sourceUrl.pathname, readFileSync(sourceUrl, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const rig = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'FocusCameraRig')
assert.ok(rig, 'exercise the camera rig actually mounted by Focus')
const compiled = ts.transpileModule(rig.getText(source), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function runLayout(camera, controls, size, options = {}) {
  const effects = []
  const context = {
    THREE,
    getFocusFrame,
    DEFAULT_TARGET: getFocusFrame(16 / 9).target,
    CAMERA_LIMIT: 8.8,
    useThree: () => ({ camera, size }),
    useMemo: factory => factory(),
    useRef: value => ({ current: value }),
    useEffect() {},
    useLayoutEffect: effect => effects.push(effect),
    useFrame() {},
  }
  vm.runInNewContext(compiled + '\nthis.rig = FocusCameraRig', context)
  context.rig({ controls: { current: controls }, recenterSignal: 1, shellRef: { current: null }, entryFrame: null, reducedMotion: false, onInputReadyChange() {}, ...options })
  for (const effect of effects) effect()
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`Recenter clears actual OrbitControls momentum at ${width}x${height}`, () => {
    const frame = getFocusFrame(width / height)
    const camera = new THREE.PerspectiveCamera(frame.fov, width / height, .08, 120)
    camera.position.set(...frame.position)
    const controls = new OrbitControls(camera)
    controls.target.set(...frame.target)
    controls.enableDamping = true
    controls.dampingFactor = .07
    controls.update()

    // This public API leaves the same pending spherical delta as a touch drag.
    controls.setAzimuthalAngle(controls.getAzimuthalAngle() + .8)
    assert.ok(camera.position.distanceTo(new THREE.Vector3(...frame.position)) > .1)
    runLayout(camera, controls, { width, height })

    const expected = new THREE.Vector3(...frame.position)
    assert.ok(camera.position.distanceTo(expected) < 1e-8, 'restore the responsive default immediately')
    assert.equal(controls.enableDamping, true, 'ordinary orbit damping remains enabled')
    for (let index = 0; index < 60; index++) controls.update()
    assert.ok(camera.position.distanceTo(expected) < 1e-8, 'pending drag momentum cannot move the recentered view')
    assert.ok(controls.target.distanceTo(new THREE.Vector3(...frame.target)) < 1e-8)
    assert.equal(camera.fov, frame.fov)
  })
}

test('calmer Recenter retains disabled damping and the portrait composition', () => {
  const size = { width: 320, height: 700 }
  const frame = getFocusFrame(size.width / size.height)
  const camera = new THREE.PerspectiveCamera(68, size.width / size.height, .08, 120)
  camera.position.set(3, 2, 8)
  const controls = new OrbitControls(camera)
  controls.enableDamping = false
  runLayout(camera, controls, size, { reducedMotion: true })
  assert.equal(controls.enableDamping, false)
  assert.ok(camera.position.distanceTo(new THREE.Vector3(...frame.position)) < 1e-8)
  assert.equal(camera.fov, frame.fov)
})
