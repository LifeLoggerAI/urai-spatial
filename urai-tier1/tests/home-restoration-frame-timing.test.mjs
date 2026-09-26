import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const start = source.indexOf('function directionFromAngles(')
const end = source.indexOf('function HomePassportSemanticBridge(', start)
assert.ok(start >= 0 && end > start)
const compiled = ts.transpile(source.slice(start, end))

function fixture(reducedMotion = false, homeTransition = 'HOME_RESTORE') {
  const camera = new THREE.PerspectiveCamera(58, 1.6, .1, 125)
  camera.position.set(2, -1, -3)
  let frame, restored = 0, departed = 0
  const effects = []
  const rig = new Function('THREE', 'useThree', 'useRef', 'useEffect', 'useFrame', `${compiled};return CameraRig;`)(
    THREE, () => ({ camera, size: { width: 1440, height: 900 } }),
    current => ({ current }), callback => effects.push(callback), callback => { frame = callback },
  )
  const owner = { current: { dataset: {} } }
  const yaw = { current: 0 }, pitch = { current: 0 }
  const origin = { camera: { position: [0, 1.02, 2.8], yaw: .12, pitch: .03 } }
  rig({
    yaw, pitch, transition: 'ground', target: { current: null }, reducedMotion, owner,
    homeStableState: 'AVATAR_HOME_FIRST_PERSON', homeTransition, homeOrigin: origin,
    cameraSnapshot: { current: new THREE.Vector3() }, movementInput: {},
    firstPersonVelocity: { current: new THREE.Vector3() }, firstPersonTarget: { current: null },
    onEmbodimentComplete: () => assert.fail('restoration cannot embody'),
    onHomeRestoreComplete: () => { restored++ }, onComplete: () => { departed++ },
  })
  effects.forEach(callback => callback())
  return { advance: delta => frame({}, delta), camera, origin, owner, yaw, pitch, restored: () => restored, departed: () => departed }
}

test('cancelled descent restores on the first rendered frame after a GPU stall', () => {
  const f = fixture()
  f.advance(.22)
  assert.equal(f.restored(), 0)
  f.advance(5.18)
  assert.equal(f.restored(), 1)
  assert.deepEqual(f.camera.position.toArray(), f.origin.camera.position)
  assert.equal(f.owner.current.dataset.homeTransitionProgress, '1.000')
  assert.equal(f.yaw.current, f.origin.camera.yaw)
  assert.equal(f.pitch.current, f.origin.camera.pitch)
  assert.equal(f.departed(), 0, 'cancel must not execute the stale descent completion')
  f.advance(10)
  assert.equal(f.restored(), 1, 'completion is emitted exactly once')
  assert.equal(f.departed(), 0)
})

test('normal and reduced-motion restores remain bounded at their authored duration', () => {
  for (const transition of ['HOME_RESTORE', 'GROUND_UNWIND', 'LIFE_MAP_UNWIND', 'ORB_COLLAPSE']) {
    for (const reduced of [false, true]) {
      const f = fixture(reduced, transition)
      const duration = reduced ? .22 : .92
      f.advance(duration / 2)
      assert.equal(f.restored(), 0)
      assert.equal(f.owner.current.dataset.homeTransitionProgress, '0.500')
      f.advance(duration / 2)
      assert.equal(f.restored(), 1)
      assert.deepEqual(f.camera.position.toArray(), f.origin.camera.position)
      assert.equal(f.departed(), 0)
    }
  }
})
