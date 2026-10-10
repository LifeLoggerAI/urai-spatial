import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeMotionProof } from '../scripts/motion-proof-observer.mjs'

test('recording summary reports exposed non-finite quaternion rather than passing it', () => {
  const proof = { source: 'unit-test-data-only', reducedMotion: false, frames: [{ms:16,intervalMs:16},{ms:80,intervalMs:64}], longTasks: [], samples: [
    {ms:0,realm:'focus',world:{'data-world-transition':'arriving'},focus:{'data-focus-camera-x':'1','data-focus-camera-y':'2','data-focus-camera-z':'3'}},
    {ms:70,realm:'replay',world:{'data-world-transition':'idle'},canvas:{firstFrame:{'data-replay-camera-quaternion':'0,NaN,0,1'}}},
  ] }
  const result = summarizeMotionProof(proof)
  assert.equal(result.nonFiniteCameraSamples.length,1)
  assert.equal(result.nonFiniteCameraSamples[0].realm,'replay')
  assert.equal(result.framesOver50Ms,1)
  assert.equal(result.stateFrameIntervals['focus:arriving'].count,1)
  assert.equal(result.stateFrameIntervals['replay:idle'].count,1)
})

test('empty recording remains unavailable, never an invented performance pass', () => {
  const result = summarizeMotionProof({source:'unit-test-data-only',reducedMotion:true,frames:[],longTasks:[],samples:[]})
  assert.equal(result.frameIntervalCount,0)
  assert.equal(result.frameIntervalMs.p95,null)
  assert.equal(result.numericCameraSamples,0)
  assert.equal(result.reducedMotion,true)
})

test('persistent hidden Home does not mislabel actual Map or Replay frame intervals', () => {
  const home={'data-home-scene-phase':'HOME'}
  const result=summarizeMotionProof({source:'unit-test-data-only',reducedMotion:false,longTasks:[],frames:[{ms:20,intervalMs:20},{ms:100,intervalMs:80}],samples:[
    {ms:0,realm:'life-map',home,map:{'data-life-map-phase':'acquisition'},world:{'data-world-transition':'idle'}},
    {ms:90,realm:'replay',home,map:{'data-life-map-phase':'arrival'},world:{'data-world-transition':'arriving'}},
  ]})
  assert.deepEqual(Object.keys(result.stateFrameIntervals),['life-map:acquisition','replay:arriving'])
  assert.equal(result.stateFrameIntervals['life-map:acquisition'].count,1)
  assert.equal(result.stateFrameIntervals['replay:arriving'].maxMs,80)
})
