'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const {runInNewContext}=require('node:vm')
const source=readFileSync(__dirname+'/memory-media-staging-request-log-proof.cjs','utf8')
function create(verifier) {
 const m={exports:{}}
 runInNewContext(source,{module:m,exports:m.exports,require: id=> {
  assert.equal(id,'./memory-media-staging-deployed-source.cjs')
  return {verifyControlPlaneEvidence:verifier}
 }, setTimeout}, {timeout:1000})
 return m.exports.verifyServingRequestAfterIngestion
}
const absent=Object.assign(Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:MISSING_REQUEST_LOGS'),{code:'missing'})
const unrelated=Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:SERVING_REQUEST_UNBOUND')
const bad=Error('STAGING_DEPLOYED_SOURCE_UNVERIFIED:SOURCE_ARCHIVE_UNATTESTED')
test('late correlated log verified only on later complete page scan',async()=>{
 let scans=0;const pauses=[]
 const attest=create(evidence=>{assert.ok(Array.isArray(evidence.requestLogs));if(!evidence.requestLogs.length)throw absent;return {verified:true}})
 const result=await attest(async()=>++scans===3?[{id:'trusted-fictional'}]:[],{}, async ms=>pauses.push(ms))
 assert.equal(result.verified,true);assert.equal(scans,3);assert.deepEqual(pauses,[1500,3000])
})
test('wrong revision log retries but can never grant acceptance',async()=>{
 let scans=0;const attest=create(()=>{throw unrelated})
 await assert.rejects(attest(async()=>{scans++;return [{id:'foreign-revision'}]}, {},async()=>{}),/SERVING_REQUEST_UNBOUND/)
 assert.equal(scans,4)
})
test('no log evidence fails closed after finite attempts',async()=>{
 let scans=0;const attest=create(()=>{throw absent})
 await assert.rejects(attest(async()=>{scans++;return []}, {},async()=>{}),/MISSING_REQUEST_LOGS/)
 assert.equal(scans,4)
})
test('wrong source provenance fails immediately without retry',async()=>{
 let scans=0;const attest=create(()=>{throw bad})
 await assert.rejects(attest(async()=>{scans++;return [{id:'fictional'}]}, {},async()=>{}),/SOURCE_ARCHIVE_UNATTESTED/)
 assert.equal(scans,1)
})
test('Cloud Logging transport or incomplete pages fail immediately',async()=>{
 let n=0;const attest=create(()=>{throw absent})
 await assert.rejects(attest(async()=>{n++;throw Error('STAGING_LOG_PAGINATION_INCOMPLETE')}, {},async()=>{}),/STAGING_LOG_PAGINATION_INCOMPLETE/)
 assert.equal(n,1)
 await assert.rejects(attest(async()=>null,{},async()=>{}),/STAGING_LOG_PAGE_MALFORMED/)
})
