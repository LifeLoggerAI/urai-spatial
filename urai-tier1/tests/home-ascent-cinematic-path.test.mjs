import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homeAscentCameraPose, HOME_ASCENT_CAMERA_DESTINATION, HOME_ASCENT_LOOK_SKY_START, HOME_ASCENT_LOOK_SKY_END } from '../src/spatial/layout/homeAscentCinematicPath.ts'

const start = [-0.85, 1.58, 8.54]
const pose = (t) => homeAscentCameraPose(start,t)
const ownerPath = join(dirname(fileURLToPath(import.meta.url)), '../src/spatial/layout/HomeWorldProductionPolished.tsx')
test('actual camera rises through visible terrain before sky reveal', () => {
  assert.equal(pose(0).position[1],start[1])
  for (const t of [0,.15,.3,.5,.7,.85]) {
    assert.ok(pose(t).position.every(Number.isFinite))
    assert.ok(pose(t).lookAt.every(Number.isFinite))
    assert.ok(pose(t).position[1] <= pose(t+.05).position[1], 'camera height must increase')
  }
  assert.ok(pose(.25).lookAt[1] < pose(.25).position[1])
  assert.ok(pose(.5).lookAt[1] < pose(.5).position[1])
  assert.ok(pose(.95).lookAt[1] > pose(.95).position[1])
  assert.deepEqual(pose(1).position,HOME_ASCENT_CAMERA_DESTINATION)
  assert.ok(HOME_ASCENT_CAMERA_DESTINATION[2] >= -18)
  assert.ok(HOME_ASCENT_LOOK_SKY_END > HOME_ASCENT_LOOK_SKY_START)
})
test('camera is bounded for reduced-motion and invalid progress', () => {
  assert.deepEqual(pose(-2),pose(0))
  assert.deepEqual(pose(4),pose(1))
  assert.deepEqual(pose(NaN),pose(0))
})
test('mounted Home uses camera telemetry and late sky handoff', (t) => {
  if (!fs.existsSync(ownerPath)) { t.skip('partial local extraction has no Home source'); return }
  const owner=fs.readFileSync(ownerPath,'utf8')
  for (const marker of [
    'homeAscentCameraPose(',
    'camera.position.set(...pose.position)',
    'camera.lookAt(...pose.lookAt)',
    'homeAscentCameraTicks',
    'homeAscentCameraPosition',
    'homeAscentCameraLookTarget',
    "phase === 'ASCENT' && props.portalSequence === 'life-map:closing'",
    "cameraCheckpoint: 'home-sky-ascent-complete'",
  ]) assert.ok(owner.includes(marker), 'missing marker: '+marker)
  assert.match(owner, /frameloop=\{quality\.documentVisible \? \(reducedMotion \? 'demand' : 'always'\) : 'never'\}/)
})
