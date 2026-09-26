import assert from 'node:assert/strict'
import test from 'node:test'
import { assertGroundCameraChange, parseGroundCamera } from '../scripts/lib/ground-camera-proof.mjs'

const idle = parseGroundCamera('0,1.69,6,0,-0.04')
test('rendered telemetry must exist and contain exactly five finite numbers', () => {
  for (const input of [null, '', '0,1,2,3', '0,1,2,3,NaN', '0,1,,3,4', '0,1,2,3,Infinity']) {
    assert.throws(() => parseGroundCamera(input))
  }
  assert.equal(idle.pitch, -0.04)
})
test('unchanged frames cannot prove movement or any named look view', () => {
  for (const state of ['after-move', 'look-down-material-gate', 'look-up-sky-gate', 'look-back-world-continuity']) {
    assert.throws(() => assertGroundCameraChange(state, idle, idle))
  }
})
test('actual translation and correctly oriented views satisfy evidence requirements', () => {
  assertGroundCameraChange('after-move', { ...idle, z: 5.5 }, idle)
  assertGroundCameraChange('look-down-material-gate', { ...idle, pitch: -0.74 }, idle)
  assertGroundCameraChange('look-up-sky-gate', { ...idle, pitch: 0.74 }, idle)
  assertGroundCameraChange('look-back-world-continuity', { ...idle, yaw: Math.PI }, idle)
})
test('a side turn and looking upward behind do not prove eye-level continuity', () => {
  assert.throws(() => assertGroundCameraChange('look-back-world-continuity', { ...idle, yaw: 1.98 }, idle))
  assert.throws(() => assertGroundCameraChange('look-back-world-continuity', { ...idle, yaw: Math.PI, pitch: 0.6 }, idle))
})
