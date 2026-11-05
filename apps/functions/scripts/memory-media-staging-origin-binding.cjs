'use strict'
// Pure, fail-closed correlation guard. This is NOT an attestation issuer.
// The production collector must obtain `origin` directly from the trusted
// readAuthenticatedUploadOrigin provider module, never from caller options,
// environment JSON, an operator receipt or arbitrary test fixtures.
function assertBoundAuthenticatedSourceOrigin(origin, expected) {
  const deny = reason => { throw Error('STAGING_SOURCE_ORIGIN_UNVERIFIED:' + reason) }
  const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x)
  if (!isRecord(origin) || !isRecord(expected)) deny('RECORD_MISSING')
  const { project, region, functionName, expectedSha, buildName, storageSource } = expected
  if (typeof project !== 'string' || !/^urai-[a-z0-9-]+-(?:staging|sandbox|test)(?:-[a-z0-9]+)?$/.test(project)
      || !/^[a-z]+-[a-z0-9]+[0-9]$/.test(region || '')
      || functionName !== 'streamMemoryMediaPlayback'
      || !/^[a-f0-9]{40}$/.test(expectedSha || '')) deny('EXPECTED_SOURCE_INVALID')
  const functionResource = `projects/${project}/locations/${region}/functions/${functionName}`
  if (origin.classification !== 'AUTHENTICATED_OBJECT_READBACK_AND_BUILD_SOURCE_LINK_ONLY'
      || origin.localSourceBuildVerified !== true
      || origin.authenticatedProviderReadback !== true
      || origin.sourceObjectMatchesLocalArchive !== true
      || origin.cloudBuildSourceObjectMatches !== true
      || origin.sourceSha !== expectedSha
      || origin.functionResource !== functionResource
      || !/^[a-f0-9]{64}$/.test(origin.sourceArchiveSha256 || '')) deny('SOURCE_RECEIPT_INCOMPLETE')
  const b = origin.sourceBucket, o = origin.sourceObject, g = origin.sourceGeneration
  if (typeof b !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,220}$/.test(b)
      || typeof o !== 'string' || o.length > 1024
      || !/^[-a-zA-Z0-9_./]+$/.test(o) || o.startsWith('/')
      || o.split('/').some(p => !p || p === '.' || p === '..')
      || typeof g !== 'string' || !/^[1-9][0-9]{0,19}$/.test(g)) deny('OBJECT_IDENTITY_INVALID')
  if (typeof origin.buildName !== 'string'
      || !new RegExp(`^projects/${project}/locations/(?:${region}|global)/builds/[a-f0-9-]{20,64}$`, 'i').test(origin.buildName))
    deny('BUILD_IDENTITY_INVALID')
  if (buildName !== undefined && origin.buildName !== buildName) deny('BUILD_IDENTITY_MISMATCH')
  if (storageSource !== undefined && (!isRecord(storageSource)
    || storageSource.bucket !== b || storageSource.object !== o
    || String(storageSource.generation || '') !== g)) deny('BUILD_OBJECT_MISMATCH')
  // A matching SHA, object, generation, and Build are NOT uploader identity.
  // The current read-only provider module intentionally returns false; only
  // future independently authenticated upload audit evidence can change it.
  if (origin.uploaderIdentityVerified !== true) deny('UPLOADER_IDENTITY_NOT_ATTESTED')
  return Object.freeze({ functionResource, buildName: origin.buildName,
    sourceArchiveSha256: origin.sourceArchiveSha256, sourceBucket: b,
    sourceObject: o, sourceGeneration: g })
}
module.exports = { assertBoundAuthenticatedSourceOrigin }
