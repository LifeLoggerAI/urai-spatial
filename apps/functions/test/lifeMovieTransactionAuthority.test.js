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
  docs.set('users/'+uid,{accountStatus:'active'})
  docs.set('users/'+uid+'/privacyPolicy/current',{version:2,revision:4,ownerId:uid,domains:{memory:{mode:'granted',replayVisible:true,lifeMapVisible:true}},enforcement:{state:'fully-enforced'}})
  docs.set('consentRecords/'+uid+'_memory_storage',{uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:'granted',receiptHash:'a'.repeat(64),expiresAt:'2030-01-01T00:00:00.000Z'})
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
    collection:()=>({add:async()=>{audited++},where:()=>({limit:()=>({query:true})})}),
    runTransaction:async callback=>{
      beforeTransaction(docs,memoryPath)
      const staged=[]
      const tx={
        get:async ref=>{transactionalReads++;return ref.query ? {empty:true} : snap(ref)},
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

function preparedReadySource(f, { revision=4, receiptHash='a'.repeat(64), attached=true, active=true }={}) {
  const uid='syntheticOwner', memoryId='syntheticMemory', receiptId='b'.repeat(64), derivative='c'.repeat(64)
  const record=f.docs.get(f.memoryPath)
  f.docs.set(f.memoryPath, { ...record,
    sourceProvenance: {authenticity:'source-derivative-not-generated-autobiography',derivativeSha256:derivative},
    sourceMedia:attached ? [{kind:'audio',mediaReceiptId:receiptId}] : [],
    firstPrivateMemoryConsent:{status:'explicit-owner-confirmation'},
    ...(active ? {firstPrivateMemoryActivation:{
      status:'explicit-owner-private-replay',ownerId:uid,memoryId,mediaReceiptId:receiptId,
      derivativeSha256:derivative,consentRevision:revision,consentReceiptHash:receiptHash
    }} : {})
  })
}
test('READY prepared source with current owner activation is admitted',async()=>{
  const f=setup({ready:true});preparedReadySource(f)
  await f.run()
  assert.equal(f.stats().wrote,1)
})
test('READY prepared source with stale activation revision is rejected',async()=>{
  const f=setup({ready:true});preparedReadySource(f,{revision:3})
  await assert.rejects(f.run(),e=>e.code==='failed-precondition')
  assert.equal(f.stats().wrote,0)
})
test('READY prepared source with renewed consent receipt hash is rejected',async()=>{
  const f=setup({ready:true});preparedReadySource(f,{receiptHash:'d'.repeat(64)})
  await assert.rejects(f.run(),e=>e.code==='failed-precondition')
  assert.equal(f.stats().wrote,0)
})
test('READY prepared source missing explicit activation is rejected',async()=>{
  const f=setup({ready:true});preparedReadySource(f,{active:false})
  await assert.rejects(f.run(),e=>e.code==='failed-precondition')
  assert.equal(f.stats().wrote,0)
})
test('READY prepared source missing activated receipt attachment is rejected',async()=>{
  const f=setup({ready:true});preparedReadySource(f,{attached:false})
  await assert.rejects(f.run(),e=>e.code==='failed-precondition')
  assert.equal(f.stats().wrote,0)
})
test('DRAFT prepared source stays draft-eligible without private playback activation',async()=>{
  const f=setup();preparedReadySource(f,{active:false,attached:false})
  await f.run()
  assert.equal(f.stats().wrote,1)
})
test('READY replay check shares the original protected-media guard instead of a substitute',()=>{
  assert.match(source,/assertFirstPrivateMemoryPlaybackBinding\(memory, uid, memoryId, receiptId, epoch\.revision, epoch\.receiptHash\)/)
  assert.match(source,/if \(status === 'ready'\)/)
  assert.match(source,/requirePreparedChapterReplayBinding\(snapshot, uid, requested\[index\]\.memoryId, consentEpoch\)/)
})
