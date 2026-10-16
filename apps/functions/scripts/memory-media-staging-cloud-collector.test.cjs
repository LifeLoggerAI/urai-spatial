'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readTrustedControlPlane,projectPath}=require('./memory-media-staging-cloud-collector.cjs')
const base={project:'urai-media-staging',region:'us-central1',functionName:'streamMemoryMediaPlayback',
 expectedSha:'a'.repeat(40),approvedProject:'urai-media-staging',
 probeObservedByHarness:true,requestUrl:'https://us-central1-urai-media-staging.cloudfunctions.net/streamMemoryMediaPlayback?receiptId=x&authorityHash=y',
 traceId:'b'.repeat(32),probeStartedAt:'2026-10-16T18:00:00Z',probeEndedAt:'2026-10-16T18:00:10Z'}
test('project and region must be exactly staging-scoped',()=>{
 assert.throws(()=>projectPath('urai-4dc1d','us-central1','streamMemoryMediaPlayback'),/STAGING_CONTROL_PLANE_INPUT_REJECTED/)
 assert.throws(()=>projectPath('urai-media-staging','../prod','streamMemoryMediaPlayback'),/STAGING_CONTROL_PLANE_INPUT_REJECTED/)
})
test('unapproved project rejected without acquiring credentials',async()=>{
 let called=false
 await assert.rejects(readTrustedControlPlane({...base,approvedProject:'urai-other-staging',
  getAccessToken:()=>{called=true;return 'x'.repeat(64)}}),/STAGING_PROJECT_NOT_APPROVED/)
 assert.equal(called,false)
})
test('missing harness-observed request rejected before credentials',async()=>{
 let called=false
 await assert.rejects(readTrustedControlPlane({...base,probeObservedByHarness:false,
  getAccessToken:()=>{called=true;return 'x'.repeat(64)}}),/STAGING_PROBE_NOT_BOUND/)
 assert.equal(called,false)
})
test('permission denial fails closed without accepting media',async()=>{
 let calls=0
 await assert.rejects(readTrustedControlPlane({...base,getAccessToken:()=> 'x'.repeat(64),
  fetcher:async()=>{calls++;return {ok:false,status:403}}}),/STAGING_CONTROL_PLANE_HTTP_403/)
 assert.equal(calls,1)
})
test('incomplete Functions record fails before any further control-plane reads',async()=>{
 let calls=0
 await assert.rejects(readTrustedControlPlane({...base,getAccessToken:()=> 'x'.repeat(64),
  fetcher:async()=>{calls++;return {ok:true,json:async()=>({name:'wrong-project'})}}}),
  /STAGING_CONTROL_PLANE_INPUT_REJECTED/)
 assert.equal(calls,1)
})
test('operator JSON is not an accepted evidence input',async()=>{
 await assert.rejects(readTrustedControlPlane({...base,records:{verified:true},
   approvedProject:undefined,getAccessToken:()=>{throw Error('SHOULD_NOT_CALL')}}),/STAGING_PROJECT_NOT_APPROVED/)
})
