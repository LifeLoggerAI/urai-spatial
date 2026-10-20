'use strict'
// CI-only diagnostic. This NEVER issues acceptance, signs a receipt, reads
// private media, or promotes a release; it only reports fixed allowlisted
// fields from a local emulator artifact without echoing private content.
const {readFileSync,statSync}=require('node:fs')
const {join}=require('node:path')
const MAX_RECEIPT_BYTES=128*1024
const COMMIT=/^[a-f0-9]{40}$/

function summarizeReceipt(receipt,expectedSha){
 const valid=receipt!==null && typeof receipt==='object' && !Array.isArray(receipt)
 const expected=typeof expectedSha==='string' && COMMIT.test(expectedSha)
 const sourceMatch=valid && expected && receipt.sourceSha===expectedSha
 const errors=valid && receipt.cleanup && Array.isArray(receipt.cleanup.errors)
   ? receipt.cleanup.errors : null
 const cleanup=errors===null?'UNKNOWN':errors.length===0?'REPORTED_COMPLETE':'INCOMPLETE'
 const first=valid && typeof receipt.firstFailure==='string' ? receipt.firstFailure : ''
 const firstFailureCode=/^(?:Error:\s*)?J9_INCOMPLETE(?:[:\s]|$)/.test(first)
   ? 'J9_INCOMPLETE' : first ? 'REDACTED_FAILURE' : 'NONE_RECORDED'
 const state=valid && receipt.status==='FAIL_CLOSED' ? 'FAIL_CLOSED'
   : valid && receipt.status==='PASS' ? 'REPORTED_PASS_NOT_RELEASE_CERTIFICATION' : 'UNKNOWN'
 return Object.freeze({schema:'URAI_JOURNEY_CI_DIAGNOSTIC_V1',
   sourceMatch:!!sourceMatch,
   receiptState:state,
   classification:valid && receipt.classification==='NON_RELEASE_PARTIAL_EMULATOR_PROOF'
     ? 'NON_RELEASE_PARTIAL_EMULATOR_PROOF' : 'UNVERIFIED',
   firstFailureCode,cleanup,
   // No positive attestation fields are ever returned from this reporter.
   releaseCertified:false,authenticMediaCertified:false})
}

function loadDiagnostic(expectedSha,file){
 try{
  const st=statSync(file)
  if(!st.isFile() || st.size<2 || st.size>MAX_RECEIPT_BYTES)throw Error('INVALID_RECEIPT')
  const receipt=JSON.parse(readFileSync(file,'utf8'))
  return summarizeReceipt(receipt,expectedSha)
 }catch{
  return Object.freeze({schema:'URAI_JOURNEY_CI_DIAGNOSTIC_V1',
   receiptState:'MISSING_OR_INVALID',sourceMatch:false,
   classification:'UNVERIFIED',firstFailureCode:'RECEIPT_UNREADABLE',
   cleanup:'UNKNOWN',releaseCertified:false,authenticMediaCertified:false})
 }
}
if(require.main===module){
 // Exactly one fixed path; no caller-selected URLs, credentials or JSON inputs.
 const file=join(process.cwd(),'artifacts','authenticated-full-journey','receipt.json')
 process.stdout.write(JSON.stringify(loadDiagnostic(process.env.URAI_EXACT_HEAD,file))+'\n')
}
module.exports={summarizeReceipt,loadDiagnostic}
