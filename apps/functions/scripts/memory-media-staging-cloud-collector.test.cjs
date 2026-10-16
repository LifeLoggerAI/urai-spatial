'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
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
