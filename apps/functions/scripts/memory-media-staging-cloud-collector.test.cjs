'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const {join}=require('node:path')
const {readTrustedControlPlane,projectPath,readBoundedLogPages}=require('./memory-media-staging-cloud-collector.cjs')
const base={project:'urai-media-staging',region:'us-central1',functionName:'streamMemoryMediaPlayback',
 expectedSha:'a'.repeat(40),requestUrl:'https://us-central1-urai-media-staging.cloudfunctions.net/streamMemoryMediaPlayback?memoryId=fictional&receiptId=fictional&authorityHash=fictional&expiresAt=1840000000000&storageGeneration=1',
 ownerIdToken:'x'.repeat(120)}
test('rejects production and malformed project scopes',()=>{
 assert.throws(()=>projectPath('urai-4dc1d','us-central1','streamMemoryMediaPlayback'),/STAGING_CONTROL_PLANE_INPUT_REJECTED/)
 assert.throws(()=>projectPath('urai-media-staging','../prod','streamMemoryMediaPlayback'),/STAGING_CONTROL_PLANE_INPUT_REJECTED/)
})
test('no caller approval, observer claim or provider injection can authorize acceptance',async()=>{
 for(const extra of [{approvedProject:'urai-media-staging'}, {probeObservedByHarness:true},
   {getAccessToken:()=>{throw Error('BAD_AUTH')}}, {fetcher:()=>{throw Error('BAD_HTTP')}}, {records:{verified:true}}]) {
  await assert.rejects(readTrustedControlPlane({...base,...extra}),/STAGING_CALLER_EVIDENCE_REJECTED/)
 }
})
test('empty canonical registry rejects before acquiring cloud credentials or network',async()=>{
 await assert.rejects(readTrustedControlPlane(base),/STAGING_PROJECT_NOT_APPROVED/)
})
test('bounded logging uses newest-first, source-bound filters and page tokens',async()=>{
 const bodies=[]
 const rows=await readBoundedLogPages(async body=>{
  bodies.push(body)
  return bodies.length===1?{entries:[{insertId:'fictional-1'}],nextPageToken:'next-page'}
   :{entries:[{insertId:'fictional-2'}]}
 },{project:'urai-media-staging',region:'us-central1',service:'streammemorymediaplayback',
   revision:'streammemorymediaplayback-00001-abc',traceId:'b'.repeat(32),
   startedAt:'2026-10-16T18:00:00Z',endedAt:'2026-10-16T18:00:10Z'})
 assert.equal(rows.length,2)
 assert.equal(bodies.length,2)
 assert.equal(bodies[0].orderBy,'timestamp desc')
 assert.equal(bodies[1].pageToken,'next-page')
 assert.match(bodies[0].filter,/revision_name="streammemorymediaplayback-00001-abc"/)
 assert.match(bodies[0].filter,/timestamp>=/)
})
test('rejects repeated pagination tokens',async()=>{
 await assert.rejects(readBoundedLogPages(async()=>({entries:[],nextPageToken:'same'}),{
  project:'urai-media-staging',region:'us-central1',service:'streammemorymediaplayback',
  revision:'streammemorymediaplayback-00001-abc',traceId:'b'.repeat(32),
  startedAt:'2026-10-16T18:00:00Z',endedAt:'2026-10-16T18:00:10Z'
 }),/STAGING_LOG_PAGE_TOKEN_REPEATED/)
})
test('rejects pagination truncated by the resource cap',async()=>{
 let i=0
 await assert.rejects(readBoundedLogPages(async()=>({entries:[],nextPageToken:'page'+(++i)}),{
  project:'urai-media-staging',region:'us-central1',service:'streammemorymediaplayback',
  revision:'streammemorymediaplayback-00001-abc',traceId:'b'.repeat(32),
  startedAt:'2026-10-16T18:00:00Z',endedAt:'2026-10-16T18:00:10Z'
 }),/STAGING_LOG_PAGINATION_INCOMPLETE/)
})
test('malformed page and time window fail closed',async()=>{
 const a={project:'urai-media-staging',region:'us-central1',service:'streammemorymediaplayback',
  revision:'streammemorymediaplayback-00001-abc',traceId:'b'.repeat(32),
  startedAt:'2026-10-16T18:00:00Z',endedAt:'2026-10-16T18:00:10Z'}
 await assert.rejects(readBoundedLogPages(async()=>({entries:'fake'}),a),/STAGING_LOG_PAGE_MALFORMED/)
 await assert.rejects(readBoundedLogPages(async()=>({entries:[]}),{...a,endedAt:'2026-10-17T18:00:00Z'}),/STAGING_LOG_WINDOW_INVALID/)
})
test('missing options fail by contract rather than a runtime TypeError',async()=>{
 await assert.rejects(readTrustedControlPlane(),/STAGING_CONTROL_PLANE_INPUT_REJECTED/)
})

test('positive staging runner uses independent collector before fixture revocation',()=>{
 const source=readFileSync(join(__dirname,'memory-media-staging-positive-proof.cjs'),'utf8')
 assert.ok(source.includes("const { attestStagingPlayback } = require('./memory-media-staging-runtime-attestation.cjs')"))
 const probe=source.indexOf('await attestStagingPlayback({')
 const revoked=source.indexOf("await consentDoc.update({status:'revoked'})")
 assert.ok(probe>0&&revoked>probe,'attestation must precede revoked fixture')
 assert.ok(source.includes('evidence.deployedSourceExactHeadVerified=attestation.verified'))
 assert.ok(!source.includes('const proof = undefined')&&!source.includes('verifyDeployedSource()'))
})

// Source-level wiring regressions: the complete response consumer has its own
// streaming/encoding negative matrix in memory-media-staging-provider-body.test.cjs.
test('collector consumes bounded provider bodies across GET, log POST and private probe',()=>{
 const source=readFileSync(join(__dirname,'memory-media-staging-cloud-collector.cjs'),'utf8')
 assert.ok(source.includes("require('./memory-media-staging-provider-body.cjs')"))
 assert.ok(source.includes('return readBoundedProviderJson(result)'))
 assert.ok(source.includes('return readBoundedProviderJson(res)'))
 assert.ok(source.includes('await readBoundedProviderBody(response,10*1024*1024)'))
 assert.ok(!source.includes('result.json()')&&!source.includes('res.json()'))
 assert.ok(!source.includes('response.arrayBuffer()'))
 assert.ok(source.includes("'accept-encoding':'identity'"))
})
test('fictional source-mode claims and unsigned direct Git cannot trigger collection',async()=>{
 for(const extra of [{sourceMode:'DIRECT_GIT_SOURCE'},{authenticatedOrigin:{uploaderIdentityVerified:true}},
  {archiveRequested:false},{approvedProject:true}]){
   await assert.rejects(readTrustedControlPlane({...base,...extra}),/STAGING_CALLER_EVIDENCE_REJECTED/)
 }
 const source=readFileSync(join(__dirname,'memory-media-staging-positive-proof.cjs'),'utf8')
 const approve=source.indexOf('const approvedSourceBucket=approvedFunctionsSourceBucket(project)')
 const credentials=source.indexOf("const admin = require('firebase-admin')")
 assert.ok(approve>0&&credentials>approve)
 assert.ok(source.includes('archivePath:sourceArchivePath,approvedSourceBucket'))
})
