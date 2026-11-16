'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=require('node:fs')
const {tmpdir}=require('node:os')
const {join,resolve}=require('node:path')
const {spawnSync}=require('node:child_process')
const {summarizeReceipt,loadDiagnostic}=require('./report-authenticated-journey.cjs')
const sha='a'.repeat(40)
function fixture(){return {sourceSha:sha,status:'FAIL_CLOSED',
  classification:'NON_RELEASE_PARTIAL_EMULATOR_PROOF',
  firstFailure:'Error: J9_INCOMPLETE: private data never goes here',
  authenticMedia:false,cleanup:{errors:[]}}}

test('reveals known J9 hold code but never full error text or an acceptance claim',()=>{
 const summary=summarizeReceipt(fixture(),sha)
 assert.equal(summary.firstFailureCode,'J9_INCOMPLETE')
 assert.equal(summary.sourceMatch,true)
 assert.equal(summary.cleanup,'REPORTED_COMPLETE')
 assert.equal(summary.releaseCertified,false)
 assert.equal(summary.authenticMediaCertified,false)
 assert.ok(!JSON.stringify(summary).includes('private data'))
 assert.ok(Object.isFrozen(summary))
})
test('wrong source and missing cleanup cannot be misrepresented',()=>{
 const x=fixture();x.sourceSha='b'.repeat(40); delete x.cleanup
 const report=summarizeReceipt(x,sha)
 assert.equal(report.sourceMatch,false)
 assert.equal(report.cleanup,'UNKNOWN')
})
test('malicious error strings and source fields never enter output',()=>{
 const x=fixture();x.firstFailure='Error: token=private-pii owner uid 012345'
 x.sourceSha='private-identifying-data'
 x.status='SUPER_SUCCEEDED';x.classification='AUTHORIZED'
 const out=JSON.stringify(summarizeReceipt(x,sha))
 for(const secret of ['private-pii','012345','SUPER_SUCCEEDED','AUTHORIZED','private-identifying-data'])
  assert.ok(!out.includes(secret))
 assert.ok(out.includes('REDACTED_FAILURE'))
})
test('claimed success cannot turn CI diagnostic into a positive media or release admission',()=>{
 const x=fixture();x.status='PASS';x.authenticMedia=true;x.releaseCertified=true
 const r=summarizeReceipt(x,sha)
 assert.equal(r.receiptState,'REPORTED_PASS_NOT_RELEASE_CERTIFICATION')
 assert.equal(r.releaseCertified,false)
 assert.equal(r.authenticMediaCertified,false)
})
test('missing, oversized and malformed receipts return fixed redacted states',()=>{
 const dir=mkdtempSync(join(tmpdir(),'urai-j9-diagnostic-'))
 try{
  let p=join(dir,'receipt.json')
  assert.equal(loadDiagnostic(sha,p).receiptState,'MISSING_OR_INVALID')
  writeFileSync(p,'{ private token missing }')
  assert.equal(loadDiagnostic(sha,p).receiptState,'MISSING_OR_INVALID')
  writeFileSync(p,'x'.repeat(128*1024+1))
  assert.equal(loadDiagnostic(sha,p).receiptState,'MISSING_OR_INVALID')
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('CLI reports only the fixed, source-bound diagnostic and exits successfully',()=>{
 const dir=mkdtempSync(join(tmpdir(),'urai-j9-cli-'))
 try{
  const target=join(dir,'artifacts','authenticated-full-journey')
  mkdirSync(target,{recursive:true})
  writeFileSync(join(target,'receipt.json'),JSON.stringify(fixture()))
  const script=resolve(__dirname,'report-authenticated-journey.cjs')
  const p=spawnSync(process.execPath,[script],{cwd:dir,env:{...process.env,URAI_EXACT_HEAD:sha},encoding:'utf8'})
  assert.equal(p.status,0)
  assert.equal(JSON.parse(p.stdout).firstFailureCode,'J9_INCOMPLETE')
  assert.ok(!p.stdout.includes('private data'))
 }finally{rmSync(dir,{recursive:true,force:true})}
})
