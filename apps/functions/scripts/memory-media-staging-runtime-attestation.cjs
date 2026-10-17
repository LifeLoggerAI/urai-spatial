'use strict'
// Production module: the collector is imported directly, never supplied by
// environment variables, operator JSON, or caller-controlled callbacks.
const { readTrustedControlPlane } = require('./memory-media-staging-cloud-collector.cjs')
const FUNCTION_NAME = 'streamMemoryMediaPlayback'

async function attestStagingPlayback(options) {
  const { project, region, expectedSha, requestUrl, ownerIdToken } = options || {}
  try {
    const proof = await readTrustedControlPlane({
      project, region, functionName: FUNCTION_NAME, expectedSha, requestUrl, ownerIdToken,
    })
    const verified = proof?.verified === true && proof.sourceSha === expectedSha
      && proof.functionName === FUNCTION_NAME && proof.servingInstanceBound === true
      && proof.authenticatedArchiveOriginBound === true && proof.uploaderIdentityVerified === true
      && /^sha256:[a-f0-9]{64}$/.test(proof.imageDigest || '')
      && typeof proof.revisionName === 'string' && proof.revisionName.length > 0
    return { verified, errorCode: verified ? null : 'STAGING_DEPLOYED_SOURCE_UNVERIFIED' }
  } catch (error) {
    // Do not emit bearer tokens, private URLs, object paths or provider bodies.
    const code = /^(STAGING_[A-Z0-9_]+)/.exec(String(error?.message || ''))?.[1]
    return { verified: false, errorCode: code || 'STAGING_DEPLOYED_SOURCE_UNVERIFIED' }
  }
}

module.exports = { attestStagingPlayback }
