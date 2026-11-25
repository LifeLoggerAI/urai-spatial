'use strict'
// Distinct evidence pathways; this pure validator never reads provider data
// and cannot issue attestation. The production collector alone obtains the
// authenticated origin directly from its source-controlled provider module.
const {assertBoundAuthenticatedSourceOrigin}=require('./memory-media-staging-origin-binding.cjs')
function requireSupportedSourceProvenance(fn,build,authenticatedOrigin,expected) {
 const bad = reason => {throw Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:'+reason)}
 const fc=fn?.buildConfig||{},bp=build?.sourceProvenance||{}
 const archives=[fc.source?.storageSource,fc.sourceProvenance?.resolvedStorageSource,
   build?.source?.storageSource,bp.resolvedStorageSource]
 const unsupported=fc.source?.repoSource||fc.source?.gitUri||fc.sourceProvenance?.resolvedRepoSource
   ||fc.sourceProvenance?.gitUri||build?.source?.repoSource
   ||build?.source?.storageSourceManifest||build?.source?.connectedRepository
   ||build?.source?.developerConnectConfig||bp.resolvedRepoSource
   ||bp.resolvedStorageSourceManifest||bp.resolvedConnectedRepository
 if(archives.some(Boolean)){
  const fs=fc.sourceProvenance?.resolvedStorageSource,bs=bp.resolvedStorageSource
  if(fs&&bs&&(fs.bucket!==bs.bucket||fs.object!==bs.object
    ||!/^[1-9][0-9]*$/.test(String(fs.generation||''))
    ||String(fs.generation)!==String(bs.generation)))bad('SOURCE_ARCHIVE_CONFLICT')
  // A source object is not proof of Git checkout or of who uploaded it.
  if(!authenticatedOrigin||!expected)bad('SOURCE_ARCHIVE_UNATTESTED')
  if(!bs||!fs||!archives.filter(Boolean).every(s=>s.bucket===bs.bucket
    &&s.object===bs.object
    &&(s.generation===undefined||s.generation===null||String(s.generation)===String(bs.generation))))
    bad('SOURCE_ARCHIVE_CONFLICT')
  if(build?.source?.gitSource||bp.resolvedGitSource||unsupported)bad('MIXED_GIT_ARCHIVE_SOURCE')
  const bound=assertBoundAuthenticatedSourceOrigin(authenticatedOrigin,{
    ...expected,buildName:build?.name,storageSource:bs
  })
  return Object.freeze({kind:'AUTHENTICATED_FIREBASE_SOURCE_ARCHIVE',...bound,
    uploaderIdentityVerified:true})
 }
 if(unsupported)bad('SOURCE_ORIGIN_UNSUPPORTED')
 if(authenticatedOrigin!==undefined)bad('UNEXPECTED_ARCHIVE_ORIGIN')
 if(!build?.source?.gitSource||!bp.resolvedGitSource)bad('DIRECT_GIT_SOURCE_INCOMPLETE')
 // No source-mode promotion: legacy callers still receive undefined here;
 // the deployed-source verifier independently checks the Git URL and SHA.
}
module.exports={requireSupportedSourceProvenance}
