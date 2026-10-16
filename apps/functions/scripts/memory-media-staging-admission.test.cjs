'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { classifyStagingMediaAcceptance } = require('./memory-media-staging-admission.cjs')

const complete = {
  actualCloudBucketMetadata: true,
  actualNoPublicIam: true,
  positiveProxyPlaybackAccepted: true,
  exactClientBlobAccepted: true,
  sourceCheckoutVerified: true,
  deployedSourceExactHeadVerified: true,
  cleanupComplete: true,
}

test('unknown deployed source is never positive staging acceptance', () => {
  const result = classifyStagingMediaAcceptance({ ...complete, deployedSourceExactHeadVerified: false })
  assert.equal(result.runResult, 'NOT_ACCEPTED')
  assert.deepEqual(result.unacceptedChecks, ['deployedSourceExactHeadVerified'])
})
test('every safety requirement is independently necessary', () => {
  for (const key of Object.keys(complete)) {
    const result = classifyStagingMediaAcceptance({ ...complete, [key]: false })
    assert.equal(result.runResult, 'NOT_ACCEPTED', key)
    assert.ok(result.unacceptedChecks.includes(key), key)
  }
})
test('execution failures override all purported positive evidence', () => {
  const result = classifyStagingMediaAcceptance(complete, true)
  assert.equal(result.runResult, 'NOT_ACCEPTED')
})
test('only fully source-bound and cleaned evidence can be accepted', () => {
  assert.deepEqual(classifyStagingMediaAcceptance(complete), {
    runResult: 'STAGING_POSITIVE_ACCEPTED', unacceptedChecks: [],
  })
})
