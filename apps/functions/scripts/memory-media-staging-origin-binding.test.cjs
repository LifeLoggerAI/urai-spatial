'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assertBoundAuthenticatedSourceOrigin: assertBound } = require('./memory-media-staging-origin-binding.cjs')
const P = 'urai-media-staging', R = 'us-central1', F = 'streamMemoryMediaPlayback'
const S = 'a'.repeat(40), D = 'b'.repeat(64)
const functionResource = `projects/${P}/locations/${R}/functions/${F}`
const buildName = `projects/${P}/locations/${R}/builds/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
function origin() {return {classification:'AUTHENTICATED_OBJECT_READBACK_AND_BUILD_SOURCE_LINK_ONLY',
 localSourceBuildVerified:true,authenticatedProviderReadback:true,
 sourceObjectMatchesLocalArchive:true,cloudBuildSourceObjectMatches:true,
 sourceSha:S,functionResource,buildName,sourceArchiveSha256:D,
 sourceBucket:'gcf-v2-sources-fixture',sourceObject:'uploads/fictional-source.zip',
 sourceGeneration:'123456',uploaderIdentityVerified:false}}
const expect=()=>({project:P,region:R,functionName:F,expectedSha:S,buildName,
 storageSource:{bucket:'gcf-v2-sources-fixture',object:'uploads/fictional-source.zip',generation:'123456'}})
const denied=(o,e,code)=>assert.throws(()=>assertBound(o,e),
 x=>x?.message===`STAGING_SOURCE_ORIGIN_UNVERIFIED:${code}`)
test('canonical module explicitly refuses unaudited uploader identity',()=>{
 denied(origin(),expect(),'UPLOADER_IDENTITY_NOT_ATTESTED')
})
test('missing, null and caller-shaped receipts are never trusted',()=>{
 for(const o of [null,undefined,{},[],{verified:true},{classification:'OFFLINE_PACKAGE_BYTES_MATCH_ONLY'}])
  assert.throws(()=>assertBound(o,expect()),/STAGING_SOURCE_ORIGIN_UNVERIFIED/)
})
test('incorrect SHA or function is never bound to current reviewed source',()=>{
 const o=origin();o.sourceSha='f'.repeat(40)
 denied(o,expect(),'SOURCE_RECEIPT_INCOMPLETE')
 const p=origin();p.functionResource=p.functionResource.replace(P,'foreign')
 denied(p,expect(),'SOURCE_RECEIPT_INCOMPLETE')
})
test('bad reviewed package digest and absent actual readback deny',()=>{
 for(const field of ['sourceArchiveSha256','localSourceBuildVerified','authenticatedProviderReadback',
  'sourceObjectMatchesLocalArchive','cloudBuildSourceObjectMatches']){
  const o=origin();o[field]=field==='sourceArchiveSha256'?'bad':false
  denied(o,expect(),'SOURCE_RECEIPT_INCOMPLETE')
 }
})
test('wrong immutable source generation or bucket fails even with alleged uploader',()=>{
 const o=origin();o.uploaderIdentityVerified=true;o.sourceGeneration='999999'
 denied(o,expect(),'BUILD_OBJECT_MISMATCH')
 const p=origin();p.uploaderIdentityVerified=true;p.sourceBucket='malicious-bucket'
 denied(p,expect(),'BUILD_OBJECT_MISMATCH')
})
test('matching object but unrelated build fails closed',()=>{
 const o=origin();o.uploaderIdentityVerified=true;o.buildName=o.buildName.replace('aaaaaaaa-aaaa','bbbbbbbb-bbbb')
 denied(o,expect(),'BUILD_IDENTITY_MISMATCH')
})
test('object path traversal and malformed object identity are denied',()=>{
 for(const path of ['../source.zip','/source.zip','a//b.zip','a/./b.zip']){
  const o=origin();o.sourceObject=path
  denied(o,expect(),'OBJECT_IDENTITY_INVALID')
 }
})
test('only fictional full identity fixture reaches the next independent gate',()=>{
 const o=origin();o.uploaderIdentityVerified=true
 const b=assertBound(o,expect())
 assert.equal(b.buildName,buildName)
 assert.equal(b.sourceArchiveSha256,D)
 assert.equal(b.sourceGeneration,'123456')
 assert.ok(Object.isFrozen(b))
 // This helper never sets verified=true, makes requests, or grants admission.
 assert.equal(b.verified,undefined)
})
test('foreign requested project cannot borrow trusted source link',()=>{
 const e=expect();e.project='urai-other-staging';const o=origin();o.uploaderIdentityVerified=true
 denied(o,e,'SOURCE_RECEIPT_INCOMPLETE')
})
