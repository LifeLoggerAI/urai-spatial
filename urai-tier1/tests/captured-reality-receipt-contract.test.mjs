import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const pipeline = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/reconstruction-pipeline-v1.json', import.meta.url), 'utf8'))
const boundary = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/parents-house-source-boundary-v1.json', import.meta.url), 'utf8'))
const readiness = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/launch-readiness-v1.json', import.meta.url), 'utf8'))
const validator = fs.readFileSync(new URL('../../scripts/validate-captured-reality-receipt.mjs', import.meta.url), 'utf8')

test('pipeline cannot skip physical evidence or turn browser proof into XR proof', () => {
  assert.equal(pipeline.invariant.originalNeverOverwritten, true)
  assert.equal(pipeline.invariant.generatedFillIsRecordedTruth, false)
  assert.equal(pipeline.invariant.browserProofImpliesXrProof, false)
  assert.equal(pipeline.invariant.splatVisualsImplyCollision, false)
  assert.ok(pipeline.stages.every((stage) => stage.maySucceedWithoutInput === false))
})

test('parents-house boundary receipt is explicit about the current byte gate and makes no reconstruction claim', () => {
  assert.equal(boundary.sourceCount, 3)
  assert.equal(boundary.observedVisibility, 'owner-only')
  assert.equal(boundary.rawConnectorDownloadCeilingBytes, 268435456)
  assert.equal(boundary.smallestSourceExceedsConnectorCeiling, true)
  assert.equal(boundary.reconstructionClaimed, false)
})

test('launch readiness refuses to call the scene or device layers complete before evidence exists', () => {
  assert.equal(readiness.reconstruction.trainedSceneExists, false)
  assert.equal(readiness.browser.routeMounted, false)
  assert.equal(readiness.mobile.performanceReceiptExists, false)
  assert.equal(readiness.xr.performanceReceiptExists, false)
  assert.equal(readiness.launchClassification, 'NOT_YET_LAUNCH_ENABLED')
})

test('receipt validator encodes anti-overclaim gates', () => {
  assert.match(validator, /cannot claim LAUNCH_READY without a trained scene/)
  assert.match(validator, /source receipt cannot masquerade as reconstruction receipt/)
  assert.match(validator, /cannot claim XR certification without device receipt/)
})
