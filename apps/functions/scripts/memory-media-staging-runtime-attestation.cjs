'use strict'
// Production module: the collector is imported directly, never supplied by
// environment variables, operator JSON, or caller-controlled callbacks.
const { readTrustedControlPlane } = require('./memory-media-staging-cloud-collector.cjs')
const FUNCTION_NAME = 'streamMemoryMediaPlayback'

async function attestStagingPlayback(options) {
  const { project, region, expectedSha, requestUrl, ownerIdToken, archivePath, approvedSourceBucket } = options || {}
  try {
    const proof = await readTrustedControlPlane({
      project, region, functionName: FUNCTION_NAME, expectedSha, requestUrl, ownerIdToken,
      ...(archivePath===undefined?{}:{archivePath}),
      ...(approvedSourceBucket===undefined?{}:{approvedSourceBucket}),
    })
    const verified = proof?.verified === true && proof.sourceSha === expectedSha
      && proof.functionName === FUNCTION_NAME && proof.servingInstanceBound === true
      // Source-format support is not authorization to weaken protected-media
      // staging policy. Direct-Git evidence may be validated by the control
      // plane but cannot admit private media without independent archive/uploader
      // approval, until a separately reviewed policy explicitly changes it.
      && proof.sourceMode === 'AUTHENTICATED_FIREBASE_SOURCE_ARCHIVE'
      && proof.authenticatedArchiveOriginBound === true
      && proof.uploaderIdentityVerified === true
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
