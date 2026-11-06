'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const path=require('node:path')
const ts=require('typescript')
const {canonicalPolicy,isCanonicalStoredPolicy}=require('./lifeMovieCanonicalFixture.cjs')
const text=fs.readFileSync(path.join(__dirname,'../src/lifeMovie.ts'),'utf8')
const compiled=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
const uid='fictionalMovieOwner',hash='a'.repeat(64)
function setup({grant='granted',mode='granted',deleted=false,pending=false,expiry='2030-01-01T00:00:00.000Z',replayVisible=true,lifeMapVisible=true,planning=false,c7Projection=false,c7Expiry='2030-01-01T00:00:00.000Z'}={}){
 const user='users/'+uid
 const docs=new Map([[user,{accountStatus:'active',deleted}],
   [user+'/privacyPolicy/current',canonicalPolicy(uid,{mode,replayVisible,lifeMapVisible})],
   ['consentRecords/'+uid+'_memory_storage',{uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:grant,receiptHash:hash,expiresAt:expiry}]])
 if(planning)docs.set('privacyDeletionTombstones/'+uid,{uid,active:true})
 if(pending)docs.set(user+'/privacyRuntime/exportAuthority',{generation:0,pendingDeletions:{staged:true}})
 let count=0
 const ref=path=>({path})
 const snapshot=ref=>{const data=docs.get(ref.path);return {exists:data!==undefined,data:()=>data,get:key=>data?.[key]}}
 const db={doc:ref,collection:()=>({where:()=>({limit:()=>({query:true})})})}
 const tx={getAll:async (...refs)=>{count+=refs.length;return refs.map(snapshot)},get:async query=>{if(!query.query)throw Error('query expected');return {empty:true}}}
 const errors=class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const functions={region:()=>({https:{onCall:f=>f}}),https:{HttpsError:errors}}
 class Timestamp {constructor(ms){this.ms=ms} toMillis(){return this.ms}}
 const admin={apps:[{}],firestore:Object.assign(()=>db,{Timestamp})}
 if(c7Projection){
   const expiresAt=c7Expiry==='missing' ? undefined : c7Expiry==='valid-sdk-timestamp' ? new Timestamp(Date.parse('2030-01-01T00:00:00.000Z'))
     : c7Expiry==='invalid-sdk-timestamp' ? new Timestamp(Number.NaN) : c7Expiry
   docs.set('privacyDeletionTombstones/'+uid,{uid,exportConsentStatus:'granted',
     exportConsentReceiptHash:hash,exportConsentPolicyVersion:'1.0.0',exportConsentExpiresAt:expiresAt})
 }
 const module={exports:{}}
 vm.runInNewContext(compiled+'\nexports.__guard=requireCurrentLifeMovieC1',{module,exports:module.exports,URL,Date,Number,Math,Set,
  require:name=>{if(name==='firebase-admin')return admin
    if(name==='firebase-functions/v1')return functions
    if(name==='node:crypto')return require('node:crypto')
    if(name==='./privatePreparedMediaAuthority'){
      const helper=fs.readFileSync(path.join(__dirname,'../src/privatePreparedMediaAuthority.ts'),'utf8')
      const compiledHelper=ts.transpileModule(helper,{compilerOptions:{
        module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
      const moduleHelper={exports:{}}
      vm.runInNewContext(compiledHelper,{module:moduleHelper,exports:moduleHelper.exports,require})
      return moduleHelper.exports
    }
    if(name==='./consentPolicyAuthority')return {isCanonicalStoredPolicy}
    throw Error('unexpected import '+name)
  }})
 return {check:status=>module.exports.__guard(tx,uid,status),count:()=>count}
}
test('valid current C1 can admit draft',async()=>{await assert.doesNotReject(setup().check('draft'))})
test('missing/revoked/paused C1 denies',async()=>{for(const grant of ['revoked','paused','unexpected'])await assert.rejects(setup({grant}).check('draft'),e=>e.code==='failed-precondition')})
test('canonical denied or limited memory mode denies',async()=>{for(const mode of ['denied','limited'])await assert.rejects(setup({mode}).check('draft'),e=>e.code==='failed-precondition')})
test('deleted owner and active privacy deletion fence deny',async()=>{for(const options of [{deleted:true},{pending:true},{planning:true}])await assert.rejects(setup(options).check('draft'),e=>e.code==='failed-precondition')})
test('expired or malformed grant denies',async()=>{for(const expiry of ['2020-01-01T00:00:00.000Z','malformed'])await assert.rejects(setup({expiry}).check('draft'),e=>e.code==='failed-precondition')})
test('READY requires both Replay and Life Map visibility',async()=>{for(const options of [{replayVisible:false},{lifeMapVisible:false}])await assert.rejects(setup(options).check('ready'),e=>e.code==='failed-precondition')})
test('manifest source enforces current C1 inside transactional update',()=>{assert.match(text,/await requireCurrentLifeMovieC1\(transaction, uid, status\)/);assert.match(text,/transaction\.set\(ref,/);assert.doesNotMatch(text,/db\.getAll\(/)})
test('canonical C7 export projection remains compatible with Life Movie C1 admission',async()=>{
 for(const c7Expiry of ['2030-01-01T00:00:00.000Z','valid-sdk-timestamp'])
   await assert.doesNotReject(setup({c7Projection:true,c7Expiry}).check('draft'))
})
test('malformed or missing C7 projection expiry never bypasses deletion fence authority',async()=>{
 for(const c7Expiry of ['not-an-ISO-date','','2030-01-01',null,'missing','invalid-sdk-timestamp'])
   await assert.rejects(setup({c7Projection:true,c7Expiry}).check('draft'),e=>e.code==='failed-precondition')
})
test('C7 expiry has canonical parser and planning tombstone targets UID document',()=>{
 assert.match(text,/function exportExpiryMillis\(value: unknown\)/)
 assert.match(text,/Number\.isSafeInteger\(exportExpiryMillis\(marker\.exportConsentExpiresAt\)\)/)
})
