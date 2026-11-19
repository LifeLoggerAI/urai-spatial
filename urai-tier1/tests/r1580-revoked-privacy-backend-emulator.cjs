'use strict'
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
const {initializeApp,deleteApp}=require('firebase/app')
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword}=require('firebase/auth')
const {getFunctions,connectFunctionsEmulator,httpsCallable}=require('firebase/functions')
const {initializeApp:adminApp,deleteApp:deleteAdminApp}=require('firebase-admin/app')
const {getAuth:adminAuth}=require('firebase-admin/auth')
const {getFirestore}=require('firebase-admin/firestore')
const project=process.env.GCLOUD_PROJECT
assert.equal(project,'urai-r1580-operational')
const apps=[]
function loadValidator(){
 const src=fs.readFileSync(path.join(__dirname,'../src/lib/privacy/privacyBackendCapability.ts'),'utf8')
 const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const m={exports:{}}; new Function('module','exports',out)(m,m.exports); return m.exports
}
function client(name,projectId=project){
 const app=initializeApp({apiKey:'demo',projectId,appId:'1:1:web:r1579'},name); apps.push(app)
 const auth=getAuth(app); connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})
 const fn=getFunctions(app,'us-central1'); connectFunctionsEmulator(fn,'127.0.0.1',5001)
 return {app,auth,fn}
}
async function call(c,name,data){return (await httpsCallable(c.fn,name,{timeout:15000})(data)).data}
;(async()=>{
 const checks=[]; const admin=adminApp({projectId:project},'r1580-admin')
 try{
  const anon=client('anon')
  await assert.rejects(call(anon,'getOperationalPrivacyCapabilities'),e=>e&&e.code==='functions/unauthenticated')
  checks.push('anonymous-handshake-denied')

  const good=client('good')
  const cred=await createUserWithEmailAndPassword(good.auth,'r1580-good@example.test','Disposable123!')
  const cap=await call(good,'getOperationalPrivacyCapabilities')
  assert.equal(cap.uid,cred.user.uid); assert.equal(cap.projectId,project); assert.equal(cap.contract,'operational-v1')
  checks.push('authenticated-capability-control')

  const {assertOperationalPrivacyBackendCapabilities}=loadValidator()
  assert.doesNotThrow(()=>assertOperationalPrivacyBackendCapabilities(cap,{uid:cred.user.uid,projectId:project}))
  assert.throws(()=>assertOperationalPrivacyBackendCapabilities(cap,{uid:cred.user.uid,projectId:'wrong-project'}),/BACKEND_UNVERIFIED/)
  checks.push('mismatched-project-rejected-by-exact-validator')

  const revoked=client('revoked')
  const rc=await createUserWithEmailAndPassword(revoked.auth,'r1580-revoked@example.test','Disposable123!')
  await rc.user.getIdToken(true)
  await adminAuth(admin).deleteUser(rc.user.uid)
  let rejected=false
  try{ await call(revoked,'getOperationalPrivacyCapabilities') }
  catch(e){ rejected=true; assert.ok(['functions/unauthenticated','functions/internal','functions/permission-denied'].includes(e.code),e.code) }
  assert.equal(rejected,true,'revoked user old credential unexpectedly accepted by capability endpoint')
  checks.push('revoked-user-handshake-denied')
  // The backend itself must reject a direct call that bypasses client preflight.
  await assert.rejects(call(revoked,'createExportRequest',{
    operationId:'r1580-revoked-export-0001',scopes:['consent']
  }),e=>e&&['functions/permission-denied','functions/unauthenticated'].includes(e.code))
  checks.push('revoked-user-direct-export-denied')
  await assert.rejects(call(revoked,'createDeletionRequest',{
    operationId:'r1580-revoked-delete-0001',scope:'memories',confirmation:'CONFIRM DELETE'
  }),e=>e&&e.code==='functions/permission-denied')
  checks.push('revoked-user-direct-deletion-denied')
  await assert.rejects(call(revoked,'getExportDownloadUrl',{jobId:'not-found'}),
    e=>e&&e.code==='functions/permission-denied')
  checks.push('revoked-user-direct-download-denied')

  const fenced=client('fenced')
  const fc=await createUserWithEmailAndPassword(fenced.auth,'r1580-fenced@example.test','Disposable123!')
  await getFirestore(admin).doc('privacyDeletionTombstones/'+fc.user.uid).set({active:true})
  await assert.rejects(call(fenced,'getOperationalPrivacyCapabilities'),
    e=>e && e.code==='functions/permission-denied')
  checks.push('active-deletion-tombstone-denied')
  await assert.rejects(call(fenced,'createExportRequest',{
    operationId:'r1580-fenced-export-0001',scopes:['audit']
  }),e=>e&&e.code==='functions/permission-denied')
  checks.push('tombstone-direct-export-denied')
  await assert.rejects(call(fenced,'createDeletionRequest',{
    operationId:'r1580-fenced-delete-0001',scope:'memories',confirmation:'CONFIRM DELETE'
  }),e=>e&&e.code==='functions/permission-denied')
  checks.push('tombstone-direct-deletion-denied')
  await assert.rejects(call(good,'getExportDownloadUrl',{jobId:'not-found'}),
    e=>e&&e.code==='functions/not-found')
  checks.push('healthy-owner-direct-download-reaches-authorized-handler')

  console.log('R1580_OPERATIONAL_EMULATOR_RESULT '+JSON.stringify({
   checksPassed:checks.length,checks,baseSource:'d5786fcab2148a77cb896a613ba9fb7c68c9db7a',candidate:'R1580 local source correction',
   project,destructiveDeletionExecuted:false,productionWrites:false
  }))
 }finally{
  await Promise.all(apps.map(deleteApp)); await deleteAdminApp(admin)
 }
})().catch(e=>{console.error('R1580_FAIL',e.code||e.name,e.stack||e);process.exitCode=1})
