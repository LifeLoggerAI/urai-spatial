import test from 'node:test'
import assert from 'node:assert/strict'
import { sampleHomeAscentFlight } from '../src/spatial/navigation/homeAscentFlight.ts'

const origin = [-0.85, 1.58, 8.4]
const initialLookAt = [-0.4, 1.1, 0.4]
const distance3 = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]))

test('Ascent preserves actual Home camera starting pose and finishes over the sanctuary', () => {
  const first = sampleHomeAscentFlight(0, origin, initialLookAt)
  const last = sampleHomeAscentFlight(1, origin, initialLookAt)
  assert.deepEqual(first.position, origin)
  assert.deepEqual(first.lookAt, initialLookAt)
  assert.ok(distance3(last.position, [-1.5, 39, -6]) < 1e-10)
  assert.deepEqual(last.lookAt, [0, 47, -30])
})

test('Normal-motion camera rises smoothly and maintains original terrain in its gaze', () => {
  const frames = Array.from({ length: 101 }, (_, i) => sampleHomeAscentFlight(i / 100, origin, initialLookAt))
  for (let i = 1; i < frames.length; i++) {
    assert.ok(frames[i].position[1] >= frames[i - 1].position[1])
    assert.ok(frames[i].lookAt[2] < frames[i].position[2], `camera must not reverse forward direction at ${i / 100}`)
    assert.ok(distance3(frames[i].position, frames[i - 1].position) < 0.9)
    assert.ok(frames[i].position.concat(frames[i].lookAt).every(Number.isFinite))
  }
  for (const progress of [0.25, 0.4, 0.6, 0.78]) {
    const pose = sampleHomeAscentFlight(progress, origin, initialLookAt)
    assert.ok(pose.lookAt[1] < pose.position[1], 'view must retain sanctuary terrain for parallax')
  }
  assert.ok(sampleHomeAscentFlight(.95, origin, initialLookAt).lookAt[1] > 20)
})

test('Reduced-motion preserves camera pose instead of flying the user', () => {
  for (const progress of [0, .2, .75, 1]) {
    assert.deepEqual(sampleHomeAscentFlight(progress, origin, initialLookAt, true), { position: origin, lookAt: initialLookAt })
  }
})

test('Out-of-bounds and invalid progress cannot create wild camera motion', () => {
  assert.deepEqual(sampleHomeAscentFlight(Number.NaN, origin, initialLookAt), sampleHomeAscentFlight(0, origin, initialLookAt))
  assert.deepEqual(sampleHomeAscentFlight(-10, origin, initialLookAt), sampleHomeAscentFlight(0, origin, initialLookAt))
  assert.deepEqual(sampleHomeAscentFlight(9, origin, initialLookAt), sampleHomeAscentFlight(1, origin, initialLookAt))
})
