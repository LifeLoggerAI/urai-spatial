import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'
import { stepEmbodiedMotion } from '../src/spatial/navigation/EmbodiedNavigation.tsx'

const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`)
function motion() {
  return {
    position: new Vector3(), velocity: new Vector3(), target: { current: null },
    input: { keys: { current: new Set(['KeyW']) }, virtualX: { current: 0 }, virtualZ: { current: 0 } },
    yaw: 0, delta: 1 / 60, speed: 3.15, acceleration: 9, deceleration: 12,
    bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  }
}

test('actual embodied acceleration distance and braking are independent of refresh rate', () => {
  const expectedTravel = -3.15 * (1 - (1 - Math.exp(-9)) / 9)
  const expectedVelocity = -3.15 * (1 - Math.exp(-9))
  const expectedEnd = expectedTravel + expectedVelocity * (1 - Math.exp(-12)) / 12
  for (const hz of [30, 60, 120]) {
    const state = motion()
    state.delta = 1 / hz
    for (let frame = 0; frame < hz; frame += 1) stepEmbodiedMotion(state)
    near(state.position.z, expectedTravel)
    near(state.velocity.z, expectedVelocity)
    state.input.keys.current.clear()
    for (let frame = 0; frame < hz; frame += 1) stepEmbodiedMotion(state)
    near(state.position.z, expectedEnd)
    near(state.velocity.z, expectedVelocity * Math.exp(-12))
  }
})

test('slow-frame collision substeps preserve elapsed movement while bounding background leaps', () => {
  const regular = motion()
  const slow = motion()
  for (let frame = 0; frame < 30; frame += 1) stepEmbodiedMotion(regular)
  slow.delta = 0.5
  stepEmbodiedMotion(slow)
  near(slow.position.z, regular.position.z)
  near(slow.velocity.z, regular.velocity.z)
  const resumed = motion()
  resumed.delta = 60
  stepEmbodiedMotion(resumed)
  near(resumed.position.z, slow.position.z)
  near(resumed.velocity.z, slow.velocity.z)
})

test('invalid input and frame times cannot poison a finite camera movement state', () => {
  for (const delta of [NaN, Infinity, -Infinity, -1]) {
    const state = motion()
    state.delta = delta
    stepEmbodiedMotion(state)
    assert.deepEqual(state.position.toArray(), [0, 0, 0])
    assert.deepEqual(state.velocity.toArray(), [0, 0, 0])
  }
  const state = motion()
  state.input.virtualX.current = Infinity
  state.input.virtualZ.current = NaN
  state.yaw = NaN
  stepEmbodiedMotion(state)
  assert.ok([...state.position.toArray(), ...state.velocity.toArray()].every(Number.isFinite))
  state.input.keys.current.clear()
  state.target.current = new Vector3(Infinity, 0, NaN)
  stepEmbodiedMotion(state)
  assert.ok([...state.position.toArray(), ...state.velocity.toArray()].every(Number.isFinite))
  assert.equal(state.target.current, null)
})

test('manual diagonal speed stays normalized and keyboard overrides guided movement', () => {
  const forward = motion()
  const diagonal = motion()
  diagonal.input.keys.current.add('KeyD')
  diagonal.target.current = new Vector3(30, 0, 30)
  for (let frame = 0; frame < 60; frame += 1) {
    stepEmbodiedMotion(forward)
    stepEmbodiedMotion(diagonal)
  }
  near(diagonal.position.length(), forward.position.length())
  assert.equal(diagonal.target.current, null)
})

test('guided arrival is checked inside a slow frame and settles without target reversal', () => {
  const state = motion()
  state.input.keys.current.clear()
  state.target.current = new Vector3(0, 0, -0.7)
  state.delta = 0.5
  stepEmbodiedMotion(state)
  assert.equal(state.target.current, null)
  assert.ok(state.position.z > -0.9, 'slow frame must stop driving after entering the arrival radius')
  for (let frame = 0; frame < 60; frame += 1) stepEmbodiedMotion(state)
  assert.ok(state.position.distanceTo(new Vector3(0, 0, -0.7)) < 0.28)
  assert.ok(state.velocity.length() < 1e-9)
  for (const hz of [30, 60, 120]) {
    const guided = motion()
    guided.input.keys.current.clear()
    guided.target.current = new Vector3(0, 0, -3)
    guided.delta = 1 / hz
    for (let frame = 0; frame < hz * 5; frame += 1) stepEmbodiedMotion(guided)
    assert.equal(guided.target.current, null)
    assert.ok(Math.abs(guided.position.z + 3) < 0.28)
    assert.ok(guided.velocity.length() < 1e-9)
    const settled = guided.position.clone()
    for (let frame = 0; frame < hz; frame += 1) stepEmbodiedMotion(guided)
    near(guided.position.distanceTo(settled), 0)
  }
})

test('existing collision and navigation bounds still constrain the actual motion kernel', () => {
  const state = motion()
  state.bounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }
  state.obstacles = [{ x: 0.2, z: -0.8, radius: 0.4 }]
  for (let frame = 0; frame < 120; frame += 1) {
    stepEmbodiedMotion(state)
    assert.ok(state.position.x >= -1 && state.position.x <= 1)
    assert.ok(state.position.z >= -1 && state.position.z <= 1)
    assert.ok(Math.hypot(state.position.x - 0.2, state.position.z + 0.8) >= 0.4 - 1e-10)
  }
})
