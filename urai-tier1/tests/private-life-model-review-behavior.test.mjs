import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { compilePersonModel } from '../src/spatial/life-model/lifeModel.ts'

const source = fs.readFileSync(new URL('../../apps/functions/src/privateLifeModelReview.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const canonical = value => Array.isArray(value) ? '['+value.map(canonical).join(',')+']' : value && typeof value==='object' ? '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,val])=>JSON.stringify(key)+':'+canonical(val)).join(',')+'}' : JSON.stringify(value)
const hash = value => createHash('sha256').update(value).digest('hex')
const owner='fixture-owner', sourceHandle='psh_abcdefghijklmnop', sourceReceiptRef='psr_abcdefghijklmnop', handle=hash(owner+'\n'+sourceHandle).slice(0,40), root=`uraiPrivateLifeModel/${handle}`
const entityPath=`users/${owner}/lifeEntities/person:fixture`, claimPath=`users/${owner}/lifeClaims/claim:fixture`
const policyPath=`users/${owner}/privacyPolicy/current`, fencePath=`uraiPrivateLifeModelOwnerFences/${hash(owner)}`

function fixture({retry=false}={}) {
  const docs=new Map(), commits=[]
  let auditCounter=0, attempts=0
  const ref=path=>({path,collection:name=>({doc:id=>ref(path+'/'+name+'/'+(id??`audit-${++auditCounter}`))})})
  const db={doc:ref,collection:path=>({doc:id=>ref(path+'/'+(id??`audit-${++auditCounter}`))}),async runTransaction(operation){
    for(let attempt=0; ; attempt++) {
      attempts++;const writes=[]
      const transaction={
        async get(reference){assert.equal(writes.length,0,'Firestore reads precede every write');const data=docs.get(reference.path);return {exists:data!==undefined,data:()=>data,get:key=>data?.[key]}},
        create(reference,data){writes.push({path:reference.path,data})},
      }
      const result=await operation(transaction)
      if(retry&&attempt===0)continue
      for(const write of writes)assert.equal(docs.has(write.path),false,'create cannot replace canonical data')
      for(const write of writes)docs.set(write.path,write.data)
      commits.push(writes);return result
    }
  }}
  class HttpsError extends Error {constructor(code,message){super(message);this.code=code}}
  const module={exports:{}}
  vm.runInNewContext(compiled,{module,exports:module.exports,Buffer,require(name){
    if(name==='node:crypto')return {createHash}
    if(name==='firebase-functions/v1')return {region:()=>({https:{onCall:callback=>callback}}),https:{HttpsError}}
    if(name==='firebase-admin')return {apps:[{}],firestore:Object.assign(()=>db,{FieldValue:{serverTimestamp:()=>({fixtureTimestamp:true})}})}
    throw new Error(`Unexpected import ${name}`)
  }})
  const candidate={schemaVersion:'urai-spatial-owner-review-import-candidate-v1',ownerId:owner,reviewState:'OWNER_REVIEW_REQUIRED',importExecutable:false,historicalSourceAuthority:false,lineage:{schemaVersion:'urai-private-source-receipt-v2',ownerUid:owner,jobId:'job-fixture-001',sourceReceiptRef,sourceHandleHash:hash(sourceHandle),sourceEvidenceClass:'DIRECT_SUBJECT_TESTIMONY',requestedPurpose:'memory-index',transcriptRef:'private:transcript/fixture',provenanceRef:'private:provenance/fixture',sourceFixityRef:'private:fixity/fixture',sourceSha256:hash('source'),sourceByteLength:42,sourceRevision:1,transcriptSha256:hash('transcript'),provenanceSha256:hash('provenance'),transcriptByteLength:24,priorMemoryIndexRef:null,locale:null,correlationTrigger:'initial-source',idempotencyKey:'job-fixture-001'},
    entities:[{id:'person:fixture',ownerId:owner,kind:'person',canonicalLabel:'Disclosed synthetic test person',aliases:[],createdFromSourceIds:[sourceReceiptRef],reviewState:'QUARANTINED'}],
    claims:[{id:'claim:fixture',ownerId:owner,subjectEntityId:'person:fixture',predicate:'role',value:'fixture-role',sourceIds:[sourceReceiptRef],reviewState:'QUARANTINED',synthetic:true,evidenceClass:'UNKNOWN',proposedEvidenceClass:'DIRECT_SUBJECT_TESTIMONY',confidence:'unknown',status:'disputed'}],relationships:[]}
  candidate.lineageSha256=hash(canonical(candidate.lineage))
  const revision={ownerUid:owner,jobId:candidate.lineage.jobId,lineage:candidate.lineage,requestDigest:hash(canonical(candidate.lineage)),schemaVersion:'urai-life-model-v1',reviewState:'OWNER_REVIEW_REQUIRED',historicalSourceAuthority:false,syntheticOutputMayBecomeHistoricalSource:false,sourceEvidenceClass:'DIRECT_SUBJECT_TESTIMONY',importCandidate:candidate}
  // The owner-review fixture must include the protected producer authority.
  const grant=candidate.lineage, consent={purpose:'memory.storage',policyVersion:'policy-fixture',decisionReceiptId:'consent-fixture'}
  const sourcePath='uraiPrivateSourceReceipts/'+hash(sourceReceiptRef)
  docs.set('jobs/'+grant.jobId,{ownerUid:owner,type:'memory.private-source.index',status:'SUCCEEDED',payload:grant,consent})
  docs.set(sourcePath,{...grant,schemaVersion:'urai-private-source-receipt-v2',sourceHandle,status:'ACTIVE',synthetic:false,purposes:['memory-index'],consent})
  docs.set(sourcePath+'/transcripts/'+hash(grant.transcriptRef),{...grant,schemaVersion:'urai-private-source-transcript-v2',status:'CURRENT',synthetic:false})
  const checksum=hash(canonical(revision))
  docs.set(root+'/revisions/00000001',{...revision,checksum,backlogState:'QUARANTINED_OWNER_REVIEW'})
  docs.set(root+'/state/current',{ownerUid:owner,revision:1,checksum,reviewState:'OWNER_REVIEW_REQUIRED',historicalSourceAuthority:false})
  docs.set(policyPath,{domains:{models:{mode:'granted',modelContext:true},identity:{mode:'granted'}},enforcement:{state:'fully-enforced'}})
  const request={handleHash:handle,revision:1,checksum,reviewId:'review:fixture',entities:['person:fixture'],claims:[{id:'claim:fixture',evidenceClass:'DIRECT_SUBJECT_TESTIMONY',confidence:'confirmed'}],relationships:[]}
  return {docs,commits,request,call:(data=request,uid=owner)=>module.exports.reviewPrivateLifeModelCandidate(data,{auth:uid?{uid}:undefined}),get attempts(){return attempts}}
}
const rejects=async (f,code,data=f.request,uid=owner)=>assert.rejects(f.call(data,uid),error=>error.code===code)

test('actual review transaction produces canonical entities and claims consumed by the person compiler',async()=>{
  const f=fixture();const result=await f.call()
  assert.equal(result.entityCount,1);assert.equal(result.claimCount,1);assert.equal(result.replayed,false)
  const person=f.docs.get(entityPath),claim=f.docs.get(claimPath)
  const bundle=compilePersonModel({ownerId:owner,person,state:{id:'state:fixture',ownerId:owner,entityId:person.id,asOf:'2026-10-07',claimIds:[claim.id],negativeConstraints:[],knowledgeCutoff:'2026-10-07',relationshipContextIds:[],sourceIds:[sourceReceiptRef]},claims:[claim],consentPurposes:['archive','identity-model']})
  assert.equal(bundle.personId,person.id);assert.deepEqual(bundle.acceptedClaimIds,[claim.id])
  assert.equal(claim.privateLifeModelChecksum,f.request.checksum)
  assert.equal(f.docs.get(`users/${owner}/lifeModelReceipts/review:fixture`).sourceChecksum,f.request.checksum)
  assert.equal([...f.docs.keys()].filter(path=>path.includes('/privacyAudit/')).length,1)
})
test('transaction retry and repeated delivery create one receipt and never duplicate canonical writes',async()=>{
  const f=fixture({retry:true});await f.call();assert.equal(f.attempts,2)
  const size=f.docs.size;const replay=await f.call()
  assert.equal(replay.replayed,true);assert.equal(f.docs.size,size);assert.equal(f.commits.at(-1).length,0)
})
test('revoked model consent prevents both first admission and replay of an existing receipt',async()=>{
  for(const admitted of [false,true]){
    const f=fixture();if(admitted)await f.call()
    f.docs.get(policyPath).domains.models.mode='denied'
    const count=f.commits.length;await rejects(f,'permission-denied');assert.equal(f.commits.length,count)
  }
})
test('owner deletion prevents both first admission and receipt replay',async()=>{
  for(const admitted of [false,true]){
    const f=fixture();if(admitted)await f.call()
    f.docs.set(fencePath,{deleted:true});const count=f.commits.length
    await rejects(f,'failed-precondition');assert.equal(f.commits.length,count)
  }
})
test('authentication and cross-owner access fail without creating canonical data',async()=>{
  const f=fixture();await rejects(f,'unauthenticated',f.request,null)
  f.docs.set('users/other/privacyPolicy/current',f.docs.get(policyPath))
  await rejects(f,'failed-precondition',f.request,'other');assert.equal(f.commits.length,0)
})
test('stale revision, altered bytes and unavailable consent enforcement fail atomically',async()=>{
  for(const mutate of [f=>{f.docs.get(root+'/state/current').revision=2},f=>{f.docs.get(root+'/revisions/00000001').importCandidate.entities[0].canonicalLabel='tampered'},f=>{f.docs.get(policyPath).enforcement.state='pending'}]){
    const f=fixture();mutate(f);await rejects(f,'failed-precondition');assert.equal(f.commits.length,0);assert.equal(f.docs.has(entityPath),false)
  }
})
test('conflicting review IDs or canonical targets cannot overwrite owner history',async()=>{
  const f=fixture();await f.call()
  const changed={...f.request,claims:[{...f.request.claims[0],confidence:'probable'}]}
  await rejects(f,'already-exists',changed)
  const fresh=fixture();fresh.docs.set(entityPath,{existing:true});await rejects(fresh,'already-exists')
  assert.deepEqual(fresh.docs.get(entityPath),{existing:true});assert.equal(fresh.docs.has(claimPath),false)
})
test('unsupported evidence promotion and unreviewed claim endpoints remain quarantined',async()=>{
  for(const data of [{entities:[]},{claims:[{id:'claim:fixture',evidenceClass:'SOURCE_CAPTURED',confidence:'confirmed'}]}]){
    const f=fixture();await rejects(f,'failed-precondition',{...f.request,...data});assert.equal(f.commits.length,0)
  }
})
