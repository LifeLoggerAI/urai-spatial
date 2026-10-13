
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import admin from 'firebase-admin'
const project='demo-urai-hybrid-proof',bucketName=project+'.appspot.com'
for(const [key,expected] of Object.entries({
  GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',
  FIREBASE_STORAGE_BUCKET:bucketName,
  URAI_ENABLE_CAPTURED_REALITY:'true',
  URAI_ENABLE_CAPTURED_REALITY_PROOF:'true',
  URAI_ENABLE_CAPTURED_REALITY_MESH:'true',
})) assert.equal(process.env[key],expected,'Refusing non-isolated Firebase configuration: '+key)
assert.equal(process.env.FUNCTIONS_EMULATOR,'true')
admin.initializeApp({projectId:project,storageBucket:bucketName})
const db=admin.firestore(),storage=admin.storage().bucket()
const hash=x=>createHash('sha256').update(x).digest('hex')
const receipt={schema:'urai-isolated-firebase-mesh-proof-1',classification:'SYNTHETIC_EMULATOR_ONLY_NOT_PRODUCTION_ADMISSION',project,checks:[]}
const check=(name,ok,detail)=>{receipt.checks.push({name,ok,detail});assert.ok(ok,name+': '+detail)}
const authRoot='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts'
const endpoint='http://127.0.0.1:5001/'+project+'/us-central1'
async function createAccount(index){
  const response=await fetch(authRoot+':signUp?key=demo',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({email:'urai-owner-'+index+'@example.invalid',password:'Emulator-Only-Fixture-42!',returnSecureToken:true})})
  const data=await response.json()
  assert.equal(response.status,200,JSON.stringify(data))
  return data
}
async function call(token,input){
  const response=await fetch(endpoint+'/getCapturedRealityMeshUrl',{method:'POST',
    headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
    body:JSON.stringify({data:input})})
  return {status:response.status,body:await response.json()}
}
const blob=Buffer.from([103,108,84,70,2,0,0,0,32,0,0,0,12,0,0,0,74,83,79,78,123,125,32,32,0,0,0,0,66,73,78,0])
const splat=Buffer.alloc(32);splat.writeFloatLE(.4,0);splat.writeFloatLE(.3,4);splat.writeFloatLE(.2,8)
for(let i=12;i<24;i+=4)splat.writeFloatLE(.1,i)
splat[24]=255;splat[25]=188;splat[26]=66;splat[27]=255;splat[28]=255;splat[29]=128;splat[30]=128;splat[31]=128
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
try{
 const a=await createAccount('a'),b=await createAccount('b'),uid=a.localId,assetId='synthetic-emulator-world'
 const sourceRef='psr_abcdefghijklmnop',sourceHash='c'.repeat(64)
 const consents=[{purpose:'memory.storage',policyVersion:'2',decisionReceiptId:'fixture-one'},
 {purpose:'location.context',policyVersion:'2',decisionReceiptId:'fixture-two'}]
 const binding={sourceReceiptRef:sourceRef,sourceRevision:1,sourceSha256:sourceHash,
  sourceByteLength:123,sourceFixityRef:'private:isolated-emulator-fixture',sourceConsentSha256:hash(JSON.stringify(consents))}
 const domain=mode=>({mode,retentionDays:30,precise:false,replayVisible:true,lifeMapVisible:true,
  modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false})
 const policy={version:2,revision:1,ownerId:uid,domains:{memory:domain('granted'),location:domain('granted'),
  models:domain('denied'),exports:domain('denied'),workforce:domain('denied'),identity:domain('denied')},
  enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'complete'}}
 await db.doc('users/'+uid).set({accountStatus:'active',deleted:false})
 await db.doc('users/'+uid+'/privacyPolicy/current').set(policy)
 await db.doc('users/'+uid+'/privacyRuntime/location-collection').set({enabled:true})
 await db.doc('users/'+uid+'/privacyRuntime/exportAuthority').set({generation:1,pendingDeletions:{}})
 await db.doc('uraiPrivateSourceReceipts/'+hash(sourceRef)).set({
  schemaVersion:'urai-private-source-receipt-v2',ownerUid:uid,status:'ACTIVE',synthetic:false,fixtureOnly:false,
  purposes:['reconstruct-place'],consents,...binding})
 const splatSha=hash(splat),meshSha=hash(blob)
 const splatObject='private-captured-reality/'+uid+'/'+assetId+'/runtime/'+splatSha+'.splat'
 const meshObject='private-captured-reality/'+uid+'/'+assetId+'/runtime/mesh/'+meshSha+'.glb'
 const sf=storage.file(splatObject),mf=storage.file(meshObject)
 await sf.save(splat,{metadata:{contentType:'application/octet-stream',metadata:{uraiRuntimeSha256:splatSha}}})
 await mf.save(blob,{metadata:{contentType:'model/gltf-binary',metadata:{uraiMeshSha256:meshSha}}})
 const [sm]=await sf.getMetadata(),[mm]=await mf.getMetadata()
 const manifest=hash('isolated-fixture')
 const registration={schemaVersion:'urai-hybrid-registration-1',splatSha256:splatSha,meshSha256:meshSha,
  splatToWorld:identity,meshToWorld:identity,sourceFrame:'right-handed-y-up',alignmentReviewed:true,
  admission:'technical-proof',metricScaleReviewed:false}
 await db.doc('users/'+uid+'/capturedRealityAssets/'+assetId).set({
  ownerId:uid,state:'proof-ready',reviewState:'rejected',releaseState:'private-pilot',truthClass:'spatially-reconstructable',
  proofState:'technical-preview',proofIntegrityVerified:true,proofPrivacyReviewed:true,
  meshProofIntegrityVerified:true,meshProofPrivacyReviewed:true,sourceBindings:[binding],
  sourceManifestSha256:manifest,proofApprovedSourceManifestSha256:manifest,
  proofApprovedMeshSourceManifestSha256:manifest,storageBucket:bucketName,
  runtimeObject:splatObject,runtimeSha256:splatSha,runtimeBytes:splat.length,
  proofApprovedRuntimeSha256:splatSha,proofApprovedStorageGeneration:String(sm.generation),
  meshRuntimeObject:meshObject,meshSha256:meshSha,meshBytes:blob.length,
  proofApprovedMeshSha256:meshSha,proofApprovedMeshStorageGeneration:String(mm.generation),
  meshRegistration:registration})
 const input={assetId,deviceTier:'desktop',accessMode:'proof'}
 const unauth=await call(null,input)
 check('missing token is denied',unauth.status!==200,String(unauth.status))
 const foreign=await call(b.idToken,input)
 check('foreign owner is denied',foreign.status!==200,String(foreign.status))
 const good=await call(a.idToken,input)
 check('owner gets real Functions descriptor',good.status===200&&good.body?.result?.available===true,
  JSON.stringify(good).slice(0,350))
 const desc=good.body.result
 check('descriptor matches immutable mesh',desc.meshSha256===meshSha&&desc.meshStorageGeneration===String(mm.generation),'hash and generation')
 const transfer=await fetch(desc.url,{headers:{authorization:'Bearer '+a.idToken}})
 const bytes=Buffer.from(await transfer.arrayBuffer())
 check('actual authenticated GLB bytes and SHA-256',transfer.status===200&&bytes.equals(blob)&&hash(bytes)===meshSha,
  String(transfer.status)+' '+bytes.length)
 const denied=await fetch(desc.url,{headers:{authorization:'Bearer '+b.idToken}})
 check('other owner cannot reuse mesh descriptor',denied.status!==200,String(denied.status))
 await db.doc('users/'+uid+'/capturedRealityAssets/'+assetId).update({meshProofPrivacyReviewed:false})
 const withdrawn=await call(a.idToken,input)
 check('mesh approval withdrawal closes descriptor',withdrawn.status!==200,String(withdrawn.status))
 const stale=await fetch(desc.url,{headers:{authorization:'Bearer '+a.idToken}})
 check('previous descriptor revoked',stale.status!==200,String(stale.status))
 await db.doc('users/'+uid+'/privacyPolicy/current').update({'domains.location.mode':'denied'})
 const privacy=await call(a.idToken,input)
 check('withdrawn location consent remains denied',privacy.status!==200,String(privacy.status))
 receipt.passed=true
}catch(e){receipt.passed=false;receipt.error=String(e.stack||e).slice(0,2500)}
finally{mkdirSync('artifacts/captured-reality-firebase-emulator',{recursive:true})
 writeFileSync('artifacts/captured-reality-firebase-emulator/receipt.json',JSON.stringify(receipt,null,2)+'\n')}
assert.equal(receipt.passed,true,JSON.stringify(receipt,null,2))
console.log(JSON.stringify({passed:receipt.passed,checks:receipt.checks},null,2))
