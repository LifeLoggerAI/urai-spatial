'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const ts = require('typescript')
const crypto = require('node:crypto')
const { isCanonicalStoredPolicy, canonicalPolicy } = require('./lifeMovieCanonicalFixture.cjs')
const uid='syntheticMediaOwner'
const markerPath='privacyDeletionTombstones/'+uid
const text=fs.readFileSync(path.join(__dirname,'../src/memoryMedia.ts'),'utf8')
const js=ts.transpileModule(text, { compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022,esModuleInterop:true} }).outputText
function fixture(marker) {
 const data=new Map([
   ['users/'+uid,{accountStatus:'active',deleted:false}],
   ['users/'+uid+'/memories/fictional',{ownerId:uid,deleted:false,privacy:'private',consentState:'authorized'}],
   ['users/'+uid+'/privacyPolicy/current',canonicalPolicy(uid)],
   ['consentRecords/'+uid+'_memory_storage',{uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:'granted',receiptHash:'a'.repeat(64),expiresAt:'2030-01-01T00:00:00.000Z'}]
 ])
 if(marker!==undefined) data.set(markerPath,marker)
 const ref=path=>({path})
 const snap=item=>{
   if(item.query)return {empty:true}
   const row=data.get(item.path)
   return {exists:row!==undefined,ref:item,data:()=>row,get:key=>key.split('.').reduce((o,k)=>o?.[k],row)}
 }
 const db={doc:ref,collection:()=>({where:()=>({limit:()=>({query:true})})})}
 const tx={get:async item=>snap(item)}
 class Timestamp {constructor(ms){this.ms=ms} toMillis(){return this.ms}}
 const admin={apps:[{}],firestore:()=>db,storage:()=>({bucket:()=>({name:'synthetic-bucket'})})}
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const functions={https:{onCall:f=>f,HttpsError},runWith:()=>({https:{onCall:f=>f,onRequest:f=>f},pubsub:{schedule:()=>({onRun:f=>f})}}),pubsub:{schedule:()=>({onRun:f=>f})}}
 const deps={
   'firebase-admin':admin,
   'firebase-admin/firestore':{FieldPath:{documentId:()=>({})},FieldValue:{serverTimestamp:()=>({})},Timestamp},
   'firebase-functions/v1':functions,
   'node:crypto':crypto,
   'node:stream/promises':require('node:stream/promises'),
   './consentPolicyAuthority':{isCanonicalStoredPolicy},
   './memoryMediaProjectBoundary':{resolveMemoryMediaProject:()=> 'demo-synthetic'},
   './privatePreparedMediaAuthority':{assertPreparedPrivateMediaFirstUpload:()=>{},assertFirstPrivateMemoryPlaybackBinding:()=>{},assertPreparedPrivateMediaUploadAuthority:()=>{}},
   './exportPagination':{chargeExportValue:()=>{},requireExportReadBudget:()=>{}}
 }
 const module={exports:{}}
 vm.runInNewContext(js+'\nexports.__readOwner=readOwner',{
   module,exports:module.exports,require:name=>{if(!Object.hasOwn(deps,name))throw Error('unexpected import '+name);return deps[name]},
   Buffer,Date,Number,Set,Map,Object,Math,process:{env:{}},URL
 })
 return {read:()=>module.exports.__readOwner(tx,uid,'fictional'),data,Timestamp}
}
test('real media admission accepts absent or canonical inactive tombstone',async()=>{
 await assert.doesNotReject(fixture().read())
 await assert.doesNotReject(fixture({uid,active:false}).read())
 const f=fixture();f.data.set(markerPath,{uid,updatedAt:new f.Timestamp(Date.now())})
 await assert.doesNotReject(f.read())
})
test('real media admission refuses contradictory inactive deletion metadata',async()=>{
 for(const marker of [
  {uid,active:false,status:'deletion_in_progress',requestId:'unfinished'},
  {uid,active:false,updatedAt:'malformed'},
  {uid,active:false,unknownFence:{status:'started'}},
  {uid,active:true},
  {uid,active:false,deletionPlanningLeaseToken:'staged'}
 ]){
  await assert.rejects(fixture(marker).read(),e=>e.code==='failed-precondition')
 }
})
test('the same real media owner guard serves upload, playback, export and cleanup',()=>{
 assert.match(text,/registerMemoryMedia[\s\S]*readOwner\(transaction, uid, memoryId\)/)
 assert.match(text,/async function playbackReceipt[\s\S]*readOwner\(transaction, uid, memoryId\)/)
 assert.match(text,/verifyMemoryMediaExportAuthorities[\s\S]*readOwner\(transaction, uid, memoryId\)/)
})


test('media owner authority rejects malformed optional updatedAt on otherwise valid C7 projection',async()=>{
 const projection={uid,exportConsentStatus:'granted',exportConsentReceiptHash:'a'.repeat(64),
   exportConsentPolicyVersion:'1.0.0',exportConsentExpiresAt:'2030-01-01T00:00:00.000Z'}
 await assert.doesNotReject(fixture(projection).read())
 const valid=fixture(projection)
 valid.data.get(markerPath).updatedAt=new valid.Timestamp(Date.now())
 await assert.doesNotReject(valid.read())
 for(const updatedAt of ['bogus',null,1700000000000,{toMillis:()=>Date.now()}]){
  await assert.rejects(fixture({...projection,updatedAt}).read(),e=>e.code==='failed-precondition')
 }
})
