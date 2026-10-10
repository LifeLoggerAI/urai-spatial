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
