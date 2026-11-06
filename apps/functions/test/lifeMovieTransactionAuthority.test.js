'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/lifeMovie.ts'), 'utf8')
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
function setup({state='authorized',privacy='private',beforeTransaction=()=>{},ready=false}={}) {
  const uid='syntheticOwner', memoryId='syntheticMemory', movieId='syntheticMovie'
  const memoryPath='users/'+uid+'/memories/'+memoryId
  const moviePath='users/'+uid+'/lifeMovies/'+movieId
  const docs=new Map([[memoryPath,{ownerId:uid,deleted:false,consentState:state,privacy,
    lifeMovie:{sceneTruthPacketId:'syntheticScene'}}]])
  if(ready) docs.set('users/'+uid+'/sceneTruthPackets/syntheticScene',{
    ownerId:uid,schemaVersion:'urai-life-model-v1',state:'current',syntheticOutputMayBecomeHistoricalSource:false,
    decision:'READY',dependencyIds:[]})
  let wrote=0, audited=0, extraReads=0, transactionalReads=0
  class HttpsError extends Error {constructor(code,message){super(message);this.code=code}}
  const doc=p=>({path:p,id:p.split('/').pop()})
  const snap=ref=>{
    const data=docs.get(ref.path)
    return {exists:data!==undefined,ref:{...ref,parent:{parent:{id:uid}}},
      id:ref.id,get:key=>key.split('.').reduce((v,k)=>v?.[k],data),data:()=>data}
  }
  const database={
    doc, getAll:async()=>{extraReads++;throw Error('PRE_TRANSACTION_DEPENDENCY_READ')},
    collection:()=>({add:async()=>{audited++}}),
    runTransaction:async callback=>{
      beforeTransaction(docs,memoryPath)
      const staged=[]
      const tx={
        get:async ref=>{transactionalReads++;return snap(ref)},
        getAll:async(...refs)=>{transactionalReads+=refs.length;return refs.map(snap)},
        set:(ref,value)=>staged.push([ref.path,value]),
      }
      const result=await callback(tx)
      for(const [p,value] of staged){docs.set(p,value);wrote++}
      return result
    }
  }
  const admin={apps:[{}],firestore:Object.assign(()=>database,{FieldValue:{serverTimestamp:()=>new Date()}})}
  const functions={https:{HttpsError},region:()=>({https:{onCall:f=>f}})}
  const module={exports:{}}
  vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>{
    if(name==='firebase-admin')return admin
    if(name==='firebase-functions/v1')return functions
    throw Error('unexpected dependency '+name)
  },URL,Set,Number,Math,Date}, {filename:'lifeMovie.ts'})
  const input={movieId,status:ready?'ready':'draft',chapters:[{id:'chapter1',memoryId,order:0}]}
  const run=()=>module.exports.upsertLifeMovieManifest(input,{auth:{uid}})
  return {run,docs,memoryPath,moviePath,stats:()=>({wrote,audited,extraReads,transactionalReads})}
}
test('authorized private memory commits a draft manifest inside transaction',async()=>{
  const f=setup();const result=await f.run()
  assert.equal(result.movieId,'syntheticMovie')
  assert.equal(f.docs.get(f.moviePath).consentState,'authorized')
  assert.equal(f.stats().extraReads,0);assert.ok(f.stats().transactionalReads>=2)
})
test('missing, unknown, pending, revoked and hidden source cannot authorize manifest',async()=>{
  for(const [state,privacy] of [[undefined,'private'],['conflicted','private'],['pending','private'],
    ['revoked','private'],['authorized','hidden']]){
    const f=setup({state,privacy});await assert.rejects(f.run(),e=>e.code==='failed-precondition')
    assert.equal(f.stats().wrote,0);assert.equal(f.stats().audited,0)
  }
})
test('consent revoked before write transaction is observed by chapter read',async()=>{
  const f=setup({beforeTransaction:(docs,p)=>docs.set(p,{...docs.get(p),consentState:'revoked'})})
  await assert.rejects(f.run(),e=>e.code==='failed-precondition')
  assert.equal(f.stats().wrote,0);assert.equal(f.stats().extraReads,0)
})
test('ready dependency revoked before transaction cannot authorize movie',async()=>{
  const f=setup({ready:true,beforeTransaction:docs=>{
    const key='users/syntheticOwner/sceneTruthPackets/syntheticScene'
    docs.set(key,{...docs.get(key),state:'revoked'})
  }})
  await assert.rejects(f.run(),e=>e.code==='failed-precondition')
  assert.equal(f.stats().wrote,0);assert.equal(f.stats().extraReads,0)
})
test('valid ready SceneTruth dependency is read transactionally',async()=>{
  const f=setup({ready:true});await f.run()
  assert.equal(f.stats().wrote,1)
  assert.ok(f.stats().transactionalReads>=3)
  assert.equal(f.stats().extraReads,0)
})
test('source retains audit, ownership and revoke callable',()=>{
  assert.match(source,/life_movie\.manifest_upserted/)
  assert.match(source,/export const revokeLifeMovieManifest/)
  assert.match(source,/consentState !== 'authorized'/)
  assert.match(source,/transaction\.getAll\(\.\.\.refs\)/)
  assert.doesNotMatch(source,/db\.getAll\(/)
})
