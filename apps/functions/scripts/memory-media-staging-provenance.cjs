'use strict'
// Google Cloud Functions Gen 2 often packages Firebase source as a GCS archive.
// A Cloud Build Git field cannot independently attest such an archive to a
// reviewed checkout. Only direct Git source plus its matching resolved Git
// record can proceed to image and serving-request checks.
function requireSupportedSourceProvenance(fn, build) {
  const bad = reason => { throw Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:' + reason) }
  const fc = fn?.buildConfig || {}
  const bp = build?.sourceProvenance || {}
  const archives = [fc.source?.storageSource,fc.sourceProvenance?.resolvedStorageSource,
    build?.source?.storageSource,bp.resolvedStorageSource]
  if(archives.some(Boolean)) {
    const fs = fc.sourceProvenance?.resolvedStorageSource, bs = bp.resolvedStorageSource
    if(fs && bs && (fs.bucket !== bs.bucket || fs.object !== bs.object
      || !/^[1-9][0-9]*$/.test(String(fs.generation || ''))
      || String(fs.generation) !== String(bs.generation))) bad('SOURCE_ARCHIVE_CONFLICT')
    // Even fully matching provider archive generation does not prove the
    // archive bytes were packaged from the exact reviewed Git SHA.
    bad('SOURCE_ARCHIVE_UNATTESTED')
  }
  if(fc.source?.repoSource || fc.source?.gitUri || fc.sourceProvenance?.resolvedRepoSource
    || fc.sourceProvenance?.gitUri || build?.source?.repoSource
    || build?.source?.storageSourceManifest || build?.source?.connectedRepository
    || build?.source?.developerConnectConfig || bp.resolvedRepoSource
    || bp.resolvedStorageSourceManifest || bp.resolvedConnectedRepository) {
    bad('SOURCE_ORIGIN_UNSUPPORTED')
  }
  if(!build?.source?.gitSource || !bp.resolvedGitSource)bad('DIRECT_GIT_SOURCE_INCOMPLETE')
}
module.exports = { requireSupportedSourceProvenance }
