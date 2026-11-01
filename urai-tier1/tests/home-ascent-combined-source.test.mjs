import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homeAscentCameraPose } from '../src/spatial/layout/homeAscentCinematicPath.ts'
import { homeAscentSkyOpacity } from '../src/spatial/layout/homeAscentSkyFade.ts'

const start = [-0.85, 1.58, 8.54]
test('both authentic camera pose and sky fade start from the original world', () => {
  const pose = homeAscentCameraPose(start, 0)
  assert.deepEqual(pose.position, start)
  assert.equal(pose.skyReveal, 0)
  assert.equal(homeAscentSkyOpacity('ASCENT', 0), 1)
})
test('camera gains altitude while sky opacity is monotonically handed off', () => {
  let prevHeight = start[1], prevOpacity = 1
  for (let n=1; n<=1000; n++) {
    const p=n/1000
    const pose=homeAscentCameraPose(start,p)
    const opacity=homeAscentSkyOpacity('ASCENT',p)
    assert.ok(pose.position[1]>=prevHeight)
    assert.ok(opacity<=prevOpacity)
    assert.ok(pose.position.every(Number.isFinite))
    assert.ok(pose.lookAt.every(Number.isFinite))
    prevHeight=pose.position[1];prevOpacity=opacity
  }
  assert.ok(prevHeight>=38)
  assert.equal(prevOpacity,0)
})
test('original scenery remains during early ascent and cosmic lighting starts only after near-complete fade',()=>{
  assert.ok(homeAscentSkyOpacity('ASCENT',.15)>.75)
  assert.equal(homeAscentCameraPose(start,.15).skyReveal,0)
  assert.ok(homeAscentSkyOpacity('ASCENT',.84)<.03)
  assert.ok(homeAscentCameraPose(start,.84).skyReveal>.9)
})
test('untrusted camera time and shader progress do not create a fabricated source video',()=>{
  assert.deepEqual(homeAscentCameraPose(start,NaN),homeAscentCameraPose(start,0))
  assert.equal(homeAscentSkyOpacity('ASCENT',NaN),1)
})
