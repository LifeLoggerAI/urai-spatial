'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const source=fs.readFileSync(path.join(__dirname,'../src/lifeMovie.ts'),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
const uid='syntheticOwner', movieId='syntheticMovie',memoryId='syntheticMemory'
const moviePath='users/'+uid+'/lifeMovies/'+movieId,memoryPath='users/'+uid+'/memories/'+memoryId
function fixture({existing=null,revokeBeforeCommit=false}={}){
 const records=new Map([[memoryPath,{ownerId:uid,deleted:false,consentState:'authorized',privacy:'private'}]])
 records.set('users/'+uid,{accountStatus:'active'})
 records.set('users/'+uid+'/privacyPolicy/current',{version:2,revision:4,ownerId:uid,domains:{memory:{mode:'granted',replayVisible:true,lifeMapVisible:true}},enforcement:{state:'fully-enforced'}})
 records.set('consentRecords/'+uid+'_memory_storage',{uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:'granted',receiptHash:'a'.repeat(64),expiresAt:'2030-01-01T00:00:00.000Z'})
 if(existing)records.set(moviePath,{...existing})
 const counts={writes:0,audits:0,retries:0}
 let interfered=false
 const ref=p=>({path:p,id:p.split('/').at(-1)})
 const snap=r=>{const row=records.get(r.path);return {exists:row!==undefined,ref:{...r,parent:{parent:{id:uid}}},get:k=>row?.[k],data:()=>row}}
 const db={doc:ref,getAll:async()=>{throw Error('UNSAFE_NONTRANSACTIONAL_READ')},
 collection:()=>({add:async()=>{counts.audits++},where:()=>({limit:()=>({query:true})})}),
 runTransaction:async callback=>{
  for(let attempt=0;attempt<3;attempt++){
   const reads=new Map(),staged=[]
   const read=r=>{reads.set(r.path,JSON.stringify(records.get(r.path)));return snap(r)}
   const tx={get:async r=>r.query ? {empty:true} : read(r),getAll:async(...refs)=>refs.map(read),
    set:(r,data)=>staged.push([r.path,data,false]),update:(r,data)=>staged.push([r.path,data,true])}
   const result=await callback(tx)
   if(revokeBeforeCommit&&!interfered){interfered=true;records.set(moviePath,{...records.get(moviePath),consentState:'revoked',revokedAt:'race'})}
   if([...reads].some(([key,old])=>old!==JSON.stringify(records.get(key)))){counts.retries++;continue}
   for(const [key,data,merge] of staged){records.set(key,merge?{...records.get(key),...data}:data);counts.writes++}
   return result
  }throw Error('TOO_MANY_CONFLICTS')
 }}
 const functions={region:()=>({https:{onCall:f=>f}}),https:{HttpsError:class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}}}
 const admin={apps:[{}],firestore:Object.assign(()=>db,{FieldValue:{serverTimestamp:()=>({synthetic:true})}})}
 const mod={exports:{}}
 vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require:name=>{
  if(name==='firebase-admin')return admin
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
  if(name==='./consentPolicyAuthority')return {isCanonicalStoredPolicy:p=>p?.version===2 && p?.ownerId===uid}
  throw Error('UNEXPECTED_IMPORT_'+name)
 },URL,Date,Math,Number,Set})
 return {records,counts,upsert:()=>mod.exports.upsertLifeMovieManifest({movieId,status:'draft',chapters:[{id:'chapter1',memoryId,order:0}]},{auth:{uid}}),
 revoke:()=>mod.exports.revokeLifeMovieManifest({movieId},{auth:{uid}})}
}
const existing={ownerId:uid,consentState:'authorized',status:'ready',version:2,createdAt:'original'}
test('authorized existing movie can be updated',async()=>{const f=fixture({existing});await f.upsert();assert.equal(f.records.get(moviePath).version,3)})
test('revoked movie ID cannot be silently reauthorized',async()=>{const f=fixture({existing:{...existing,consentState:'revoked',revokedAt:'yes'}});await assert.rejects(f.upsert(),e=>e.code==='failed-precondition');assert.equal(f.counts.writes,0)})
test('revocation marker denies malformed reauthorization',async()=>{for(const consentState of ['authorized','unknown',null]){const f=fixture({existing:{...existing,consentState,revokedAt:'yes'}});await assert.rejects(f.upsert(),e=>e.code==='failed-precondition');assert.equal(f.counts.writes,0)}})
test('foreign owner cannot overwrite existing movie',async()=>{const f=fixture({existing:{...existing,ownerId:'foreign'}});await assert.rejects(f.upsert(),e=>e.code==='failed-precondition');assert.equal(f.counts.writes,0)})
test('revoke is an atomic transaction, preserves movie and audits',async()=>{const f=fixture({existing});const result=await f.revoke();assert.equal(result.revoked,true);assert.equal(f.records.get(moviePath).consentState,'revoked');assert.equal(f.counts.writes,1);assert.equal(f.counts.audits,1)})
test('revoke then upsert cannot resurrect the movie',async()=>{const f=fixture({existing});await f.revoke();await assert.rejects(f.upsert(),e=>e.code==='failed-precondition');assert.equal(f.records.get(moviePath).consentState,'revoked')})
test('concurrent revocation aborts upsert after transaction retry',async()=>{const f=fixture({existing,revokeBeforeCommit:true});await assert.rejects(f.upsert(),e=>e.code==='failed-precondition');assert.equal(f.counts.retries,1);assert.equal(f.counts.writes,0);assert.equal(f.records.get(moviePath).consentState,'revoked')})
test('missing or foreign movie cannot be revoked',async()=>{for(const record of [null,{...existing,ownerId:'foreign'}]){const f=fixture({existing:record});await assert.rejects(f.revoke(),e=>e.code==='not-found');assert.equal(f.counts.writes,0);assert.equal(f.counts.audits,0)}})
