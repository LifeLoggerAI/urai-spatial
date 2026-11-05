'use strict'
// Read-only, bounded eventual-consistency recovery for Cloud Run request logs.
// A row, HTTP 200 or trace match alone never grants acceptance: every attempt
// runs the original exact-source, revision, image and serving-log verifier.
const { verifyControlPlaneEvidence } = require('./memory-media-staging-deployed-source.cjs')
const POLL_DELAYS_MS = Object.freeze([0, 1500, 3000, 6000])
const RETRYABLE = new Set([
  'STAGING_DEPLOYED_SOURCE_UNVERIFIED:MISSING_REQUEST_LOGS',
  'STAGING_DEPLOYED_SOURCE_UNVERIFIED:SERVING_REQUEST_UNBOUND',
])
const defaultPause = ms => new Promise(resolve => setTimeout(resolve, ms))

async function verifyServingRequestAfterIngestion(readCompletePages, authoritative, pause = defaultPause) {
  if (typeof readCompletePages !== 'function' || typeof pause !== 'function' || !authoritative
      || typeof authoritative !== 'object' || Array.isArray(authoritative)) {
    throw Error('STAGING_SERVING_LOG_INPUT_INVALID')
  }
  let lastFailure
  for (let attempt = 0; attempt < POLL_DELAYS_MS.length; attempt++) {
    if (attempt) await pause(POLL_DELAYS_MS[attempt])
    // readCompletePages MUST use source/revision/trace-scoped pages and exhaust
    // every nextPageToken; partial scans, API errors and pagination caps throw.
    const logs = await readCompletePages()
    if (!Array.isArray(logs)) throw Error('STAGING_LOG_PAGE_MALFORMED')
    try {
      return verifyControlPlaneEvidence({ ...authoritative, requestLogs: logs })
    } catch (error) {
      if (!RETRYABLE.has(error?.message)) throw error
      lastFailure = error
    }
  }
  // No fabricated positive result after the bounded ingestion window.
  throw lastFailure || Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:MISSING_REQUEST_LOGS')
}

module.exports = { verifyServingRequestAfterIngestion }
