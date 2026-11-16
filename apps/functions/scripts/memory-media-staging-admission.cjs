'use strict'

// A successful protected HTTP response does not establish deployed-source
// identity. Real staging admission also needs an independently verified
// deployment artifact for the exact reviewed checkout SHA.
const REQUIRED = Object.freeze([
  'actualCloudBucketMetadata',
  'actualNoPublicIam',
  'positiveProxyPlaybackAccepted',
  'exactClientBlobAccepted',
  'sourceCheckoutVerified',
  'deployedSourceExactHeadVerified',
  'cleanupComplete',
])

function classifyStagingMediaAcceptance(evidence, hasExecutionError = false) {
  const missing = REQUIRED.filter(key => evidence?.[key] !== true)
  const accepted = hasExecutionError !== true && missing.length === 0
  return {
    runResult: accepted ? 'STAGING_POSITIVE_ACCEPTED' : 'NOT_ACCEPTED',
    unacceptedChecks: missing,
  }
}

module.exports = { classifyStagingMediaAcceptance }
