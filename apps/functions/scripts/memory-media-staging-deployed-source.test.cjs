'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {verifyControlPlaneEvidence}=require('./memory-media-staging-deployed-source.cjs')
const fixture={"project":"urai-media-staging","region":"us-central1","functionName":"streamMemoryMediaPlayback","expectedSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","traceId":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","requestUrl":"https://us-central1-urai-media-staging.cloudfunctions.net/streamMemoryMediaPlayback?memoryId=fictional_1&receiptId=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&authorityHash=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&expiresAt=1820000000000&storageGeneration=123","probeStartedAt":"2026-10-16T18:00:00Z","probeEndedAt":"2026-10-16T18:00:10Z","functionRecord":{"name":"projects/urai-media-staging/locations/us-central1/functions/streamMemoryMediaPlayback","environment":"GEN_2","state":"ACTIVE","buildConfig":{"entryPoint":"streamMemoryMediaPlayback","build":"projects/urai-media-staging/locations/us-central1/builds/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},"serviceConfig":{"service":"projects/urai-media-staging/locations/us-central1/services/streammemorymediaplayback","revision":"streammemorymediaplayback-00001-abc","allTrafficOnLatestRevision":true}},"runService":{"name":"projects/urai-media-staging/locations/us-central1/services/streammemorymediaplayback","reconciling":false,"terminalCondition":{"state":"CONDITION_SUCCEEDED"},"generation":"2","observedGeneration":"2","latestReadyRevision":"streammemorymediaplayback-00001-abc","trafficStatuses":[{"percent":100,"revision":"streammemorymediaplayback-00001-abc"}]},"runRevision":{"name":"projects/urai-media-staging/locations/us-central1/services/streammemorymediaplayback/revisions/streammemorymediaplayback-00001-abc","service":"projects/urai-media-staging/locations/us-central1/services/streammemorymediaplayback","containers":[{"image":"us-central1-docker.pkg.dev/urai-media-staging/gcf-artifacts/private-media@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}]},"cloudBuild":{"name":"projects/urai-media-staging/locations/us-central1/builds/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","projectId":"urai-media-staging","status":"SUCCESS","results":{"images":[{"name":"us-central1-docker.pkg.dev/urai-media-staging/gcf-artifacts/private-media","digest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}]},"sourceProvenance":{"resolvedGitSource":{"url":"https://github.com/LifeLoggerAI/urai-spatial.git","revision":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}},"source":{"gitSource":{"url":"https://github.com/LifeLoggerAI/urai-spatial.git"}}},"requestLogs":[{"logName":"projects/urai-media-staging/logs/run.googleapis.com%2Frequests","resource":{"type":"cloud_run_revision","labels":{"project_id":"urai-media-staging","location":"us-central1","service_name":"streammemorymediaplayback","revision_name":"streammemorymediaplayback-00001-abc"}},"labels":{"instanceId":"00000000abcdef"},"trace":"projects/urai-media-staging/traces/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","timestamp":"2026-10-16T18:00:05Z","httpRequest":{"requestUrl":"https://us-central1-urai-media-staging.cloudfunctions.net/streamMemoryMediaPlayback?memoryId=fictional_1&receiptId=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&authorityHash=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc&expiresAt=1820000000000&storageGeneration=123","requestMethod":"GET","status":200}}]}
const deep=()=>JSON.parse(JSON.stringify(fixture))
test('fictional consistent cloud build revision serving chain',()=>{const result=verifyControlPlaneEvidence(deep());assert.equal(result.verified,true)})
test('foreign project fails closed',()=>{const x=deep(); (x=>x.functionRecord.name=x.functionRecord.name.replace(x.project,"other-project"))(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('wrong git commit fails closed',()=>{const x=deep(); (x=>x.cloudBuild.sourceProvenance.resolvedGitSource.revision="f".repeat(40))(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('wrong git repo fails closed',()=>{const x=deep(); (x=>x.cloudBuild.sourceProvenance.resolvedGitSource.url="https://github.com/attacker/urai-spatial.git")(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('wrong image fails closed',()=>{const x=deep(); (x=>x.cloudBuild.results.images[0].digest="sha256:"+"f".repeat(64))(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('other serving revision fails closed',()=>{const x=deep(); (x=>x.runService.trafficStatuses[0].revision="different-00001-xyz")(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('split traffic fails closed',()=>{const x=deep(); (x=>x.runService.trafficStatuses[0].percent=80)(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('unbound trace fails closed',()=>{const x=deep(); (x=>x.requestLogs[0].trace="projects/"+x.project+"/traces/"+("f".repeat(32)))(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('missing instance fails closed',()=>{const x=deep(); (x=>delete x.requestLogs[0].labels.instanceId)(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('stale request fails closed',()=>{const x=deep(); (x=>x.requestLogs[0].timestamp="2026-10-14T18:00:00Z")(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('missing image fails closed',()=>{const x=deep(); (x=>x.runRevision={})(x);assert.throws(()=>verifyControlPlaneEvidence(x),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/)})
test('missing and empty serving logs reject for explicit reasons',()=>{
 for(const value of [undefined,null,[],{}]){
  const x=deep()
  if(value===undefined) delete x.requestLogs
  else x.requestLogs=value
  assert.throws(()=>verifyControlPlaneEvidence(x),e=>e instanceof Error
   && e.message==='STAGING_DEPLOYED_SOURCE_UNVERIFIED:MISSING_REQUEST_LOGS')
 }
})
test('malformed and unrelated log entries cannot produce positive evidence',()=>{
 for(const entry of [null,{},[],{httpRequest:{status:200}},{resource:null}]){
  const x=deep();x.requestLogs=[entry]
  assert.throws(()=>verifyControlPlaneEvidence(x),e=>e instanceof Error
    && e.message==='STAGING_DEPLOYED_SOURCE_UNVERIFIED:SERVING_REQUEST_UNBOUND')
 }
})
test('wrong request method, response status and request path deny exact serving claim',()=>{
 for(const field of ['method','status','path']){
  const x=deep(),log=x.requestLogs[0]
  if(field==='method')log.httpRequest.requestMethod='POST'
  if(field==='status')log.httpRequest.status=403
  if(field==='path')log.httpRequest.requestUrl=log.httpRequest.requestUrl.replace('/streamMemoryMediaPlayback?','/incorrect/streamMemoryMediaPlayback?')
  assert.throws(()=>verifyControlPlaneEvidence(x),e=>e instanceof Error
    && e.message==='STAGING_DEPLOYED_SOURCE_UNVERIFIED:SERVING_REQUEST_UNBOUND')
 }
})
test('missing control plane evidence fails closed',()=>assert.throws(()=>verifyControlPlaneEvidence({}),/STAGING_DEPLOYED_SOURCE_UNVERIFIED/))

test('fictional archive chain cannot borrow the direct-Git identity',()=>{
 const x=deep(),s={bucket:'gcf-v2-sources-fixture',object:'uploads/fictional-source.zip',generation:'123456'}
 x.functionRecord.buildConfig.source={storageSource:s}
 x.functionRecord.buildConfig.sourceProvenance={resolvedStorageSource:s}
 x.cloudBuild.source={storageSource:s}
 x.cloudBuild.sourceProvenance={resolvedStorageSource:s}
 assert.throws(()=>verifyControlPlaneEvidence(x),/SOURCE_ARCHIVE_UNATTESTED/)
 x.authenticatedOrigin={classification:'AUTHENTICATED_OBJECT_READBACK_AND_BUILD_SOURCE_LINK_ONLY',
   localSourceBuildVerified:true,authenticatedProviderReadback:true,
   sourceObjectMatchesLocalArchive:true,cloudBuildSourceObjectMatches:true,
   sourceSha:x.expectedSha,functionResource:x.functionRecord.name,buildName:x.cloudBuild.name,
   sourceArchiveSha256:'d'.repeat(64),sourceBucket:s.bucket,sourceObject:s.object,
   sourceGeneration:s.generation,uploaderIdentityVerified:false}
 assert.throws(()=>verifyControlPlaneEvidence(x),/UPLOADER_IDENTITY_NOT_ATTESTED/)
 // Pure FICTIONAL contract only; production collection cannot inject this record.
 x.authenticatedOrigin.uploaderIdentityVerified=true
 const ok=verifyControlPlaneEvidence(x)
 assert.equal(ok.verified,true)
 assert.equal(ok.sourceMode,'AUTHENTICATED_FIREBASE_SOURCE_ARCHIVE')
 assert.equal(ok.authenticatedArchiveOriginBound,true)
 for(const badField of ['sourceSha','sourceBucket','sourceGeneration','buildName']){
  const y=deep()
  y.functionRecord.buildConfig.source={storageSource:s}
  y.functionRecord.buildConfig.sourceProvenance={resolvedStorageSource:s}
  y.cloudBuild.source={storageSource:s}
  y.cloudBuild.sourceProvenance={resolvedStorageSource:s}
  y.authenticatedOrigin={...x.authenticatedOrigin,[badField]:'incorrect'}
  assert.throws(()=>verifyControlPlaneEvidence(y),/STAGING_SOURCE_ORIGIN_UNVERIFIED/)
 }
})
