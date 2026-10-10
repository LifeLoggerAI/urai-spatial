import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cameraFrameDelta, cameraDampingAlpha, cameraLerpAlpha, dampCameraAngle } from '../src/spatial/canon/cameraMotion.ts'

const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`)

test('camera convergence preserves elapsed motion across 30, 60 and 120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    let position = 8.4
    let fov = 42
    for (let frame = 0; frame < hz; frame += 1) {
      const alpha = cameraDampingAlpha(2.4, 1 / hz)
      position += (-12 - position) * alpha
      fov += (48 - fov) * alpha
    }
    near(position, -12 + 20.4 * Math.exp(-2.4))
    near(fov, 48 - 6 * Math.exp(-2.4))
  }
})

test('legacy 60 Hz lerp coefficients retain their feel at every tested refresh rate', () => {
  for (const alphaAt60Hz of [0.04, 0.065, 0.14, 0.18]) {
    near(cameraLerpAlpha(alphaAt60Hz, 1 / 60), alphaAt60Hz)
    for (const hz of [30, 60, 120]) {
      let remaining = 1
      for (let frame = 0; frame < hz; frame += 1) remaining *= 1 - cameraLerpAlpha(alphaAt60Hz, 1 / hz)
      near(remaining, (1 - alphaAt60Hz) ** 60)
    }
  }
})

test('invalid frame time freezes motion and tab resume uses a bounded delta', () => {
  for (const delta of [NaN, Infinity, -Infinity, -1, 0]) {
    assert.equal(cameraFrameDelta(delta), 0)
    assert.equal(cameraDampingAlpha(6, delta), 0)
    assert.equal(cameraLerpAlpha(0.14, delta), 0)
  }
  near(cameraFrameDelta(20), 0.1)
  near(cameraDampingAlpha(6, 20), cameraDampingAlpha(6, 0.1))
  near(cameraFrameDelta(20, 0.5), 0.5)
  assert.equal(cameraFrameDelta(0.1, -1), 0)
  for (const lambda of [NaN, Infinity, -Infinity, -6, 0]) assert.equal(cameraDampingAlpha(lambda, 1 / 60), 0)
  assert.equal(cameraLerpAlpha(NaN, 1 / 60), 0)
  assert.equal(cameraLerpAlpha(1, 1 / 60), 1)
})

test('a camera at its destination remains stable and converging motion never overshoots', () => {
  let position = 10
  for (let frame = 0; frame < 600; frame += 1) {
    position += (0 - position) * cameraDampingAlpha(6, 1 / 60)
    assert.ok(position >= 0 && position <= 10)
  }
  near(position, 0)
  const settled = position
  for (let frame = 0; frame < 120; frame += 1) position += (settled - position) * cameraDampingAlpha(6, 1 / 60)
  assert.equal(position, settled)
})

test('yaw crosses the wrap boundary by the short path at 30, 60 and 120 Hz', () => {
  const start = Math.PI - 0.01
  const target = -Math.PI + 0.01
  for (const hz of [30, 60, 120]) {
    let yaw = start
    for (let frame = 0; frame < hz; frame += 1) yaw = dampCameraAngle(yaw, target, 6, 1 / hz)
    near(yaw, start + 0.02 * (1 - Math.exp(-6)))
    assert.ok(yaw > start && yaw < start + 0.02)
  }
  assert.equal(dampCameraAngle(NaN, 0.3, 6, 1 / 60), 0.3)
  assert.equal(dampCameraAngle(0.3, Infinity, 6, 1 / 60), 0.3)
  assert.equal(dampCameraAngle(NaN, Infinity, 6, 1 / 60), 0)
})
