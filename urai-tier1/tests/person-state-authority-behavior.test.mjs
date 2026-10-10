import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { createHash } from 'node:crypto'
const sourceRoot = process.env.LIFE_GRAPH_TEST_ROOT || new URL('../../apps/functions/src/', import.meta.url)
const sha = s => createHash('sha256').update(s).digest('hex')
const uid = 'disclosed-synthetic-owner', sourceId = 'psr_abcdefghijklmnop'
const prefix = 'users/' + uid + '/', sourcePath = 'uraiPrivateSourceReceipts/' + sha(sourceId)
const copy = v => v === undefined ? undefined : structuredClone(v)
function fixture() {
 const docs = new Map(), versions = new Map(), commits = []; let conflict, retries = 0
 const put = (p, v) => { docs.set(p, copy(v)); versions.set(p, (versions.get(p) || 0) + 1) }
 const ref = p => ({path:p,id:p.split('/').at(-1),parent:{id:p.split('/').at(-2)},get:async()=>snapshot(p),set:async(v,o)=>put(p,o?.merge?{...docs.get(p),...v}:v)})
 const snapshot = p => {const data=copy(docs.get(p));return {exists:data!==undefined,id:p.split('/').at(-1),ref:ref(p),get:k=>data?.[k],data:()=>data}}
 const db = {doc:ref,getAll:async(...refs)=>refs.map(r=>snapshot(r.path)),collection:p=>({doc:id=>ref(p+'/'+id)}),
 async runTransaction(fn) {
  for(let attempt=0;attempt<4;attempt++) {
   const reads = new Map(), writes = []
   const tx = {get:async r=>{assert.equal(writes.length,0,'reads must precede writes');reads.set(r.path,versions.get(r.path)||0);return snapshot(r.path)},
    getAll:async(...refs)=>Promise.all(refs.map(r=>tx.get(r))),
    set:(r,v,o)=>writes.push({r,v,o}),create:(r,v)=>{assert.equal(docs.has(r.path),false);writes.push({r,v})}}
   const result=await fn(tx)
   if(conflict){const hook=conflict;conflict=undefined;hook()}
   if([...reads].some(([p,v])=>v!==(versions.get(p)||0))){retries++;continue}
   writes.forEach(({r,v,o})=>put(r.path,o?.merge?{...docs.get(r.path),...v}:v));commits.push(writes);return result
  }
  throw new Error('transaction conflict')
 }}
 const fieldValue={serverTimestamp:()=> 'synthetic-clock'}
 const firestore=Object.assign(()=>db,{FieldValue:fieldValue})
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const functions={region:()=>({https:{onCall:fn=>fn}}),https:{HttpsError}}
 const modules=new Map()
 function load(file) {
  const url=sourceRoot instanceof URL?new URL(file,sourceRoot):path.resolve(sourceRoot,file)
  const key=String(url);if(modules.has(key))return modules.get(key)
  const module={exports:{}}
  const code=ts.transpileModule(fs.readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  vm.runInNewContext(code,{module,exports:module.exports,Buffer,require:name=>{
   if(name==='firebase-functions/v1')return functions
   if(name==='firebase-admin')return {apps:[{}],firestore}
   if(name==='node:crypto')return {createHash}
   if(name==='./lifeGraphAuthority')return load('lifeGraphAuthority.ts')
   if(name==='./consentPolicyAuthority')return load('consentPolicyAuthority.ts')
   if(name==='./personPresenceAuthority')return {invalidateLifeModelDependencies:async()=>0}
   throw new Error('unexpected import '+name)
  }})
  modules.set(key,module.exports);return module.exports
 }
 const handlers=load('lifeModelFunctions.ts')
 const authority=load('lifeGraphAuthority.ts')
 put(prefix+'privacyPolicy/current',{version:2,revision:0,ownerId:uid,domains:Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(domain=>[domain,{mode:['models','identity'].includes(domain)?'granted':'denied',retentionDays:null,precise:false,replayVisible:false,lifeMapVisible:false,modelContext:domain==='models',sharingEnabled:false,automationEnabled:false,likenessEnabled:false}])),enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}})
 put(sourcePath,{schemaVersion:'urai-private-source-receipt-v2',ownerUid:uid,sourceReceiptRef:sourceId,status:'ACTIVE',synthetic:false,
  purposes:['memory-index'],sourceRevision:1,sourceSha256:sha('synthetic-source'),sourceFixityRef:'private:fixity/synthetic',sourceByteLength:42,
  sourceHandle:'psh_abcdefghijklmnop',sourceEvidenceClass:'SOURCE_CAPTURED',consent:{purpose:'memory.storage',policyVersion:'test-policy',decisionReceiptId:'test-receipt'}})
 const src=docs.get(sourcePath), binding=[{id:sourceId,sourceRevision:src.sourceRevision,sourceSha256:src.sourceSha256,sourceFixityRef:src.sourceFixityRef,
  sourceByteLength:src.sourceByteLength,sourceEvidenceClass:src.sourceEvidenceClass,sourceHandleHash:sha(src.sourceHandle),consent:src.consent}]
 const bind=authority.lifeAuthorityDigest(binding)
 for(const id of ['person-a','event-a'])put(prefix+'lifeEntities/'+id,{id,ownerId:uid,kind:id==='person-a'?'person':'event',canonicalLabel:'Disclosed synthetic fixture',createdFromSourceIds:[sourceId],revoked:false,revision:1,sourceBindingDigest:bind})
 put(prefix+'lifeClaims/claim-a',{id:'claim-a',ownerId:uid,subjectEntityId:'person-a',predicate:'role',value:'synthetic-role',valueDigest:sha(JSON.stringify('synthetic-role')),
  evidenceClass:'SOURCE_CAPTURED',sourceIds:[sourceId],confidence:'confirmed',status:'accepted',synthetic:false,sourceBindingDigest:bind})
 const call=(name,data,owner=uid)=>handlers[name](data,{auth:owner?{uid:owner}:undefined})
 const graph={snapshotId:'graph-a',entityIds:['person-a','event-a'],claimIds:['claim-a'],edgeIds:[]}
 const scene={sceneId:'scene-a',graphSnapshotId:'graph-a',presentationClass:'ARCHIVAL',personModelBundleIds:[],knownClaimIds:['claim-a'],sourceIds:[sourceId]}
 const edge={id:'edge-a',fromEntityId:'person-a',toEntityId:'event-a',kind:'PARTICIPATED_IN',evidenceClass:'SOURCE_CAPTURED',confidence:'confirmed',status:'accepted',sourceIds:[sourceId],synthetic:false}
 const amend=(p,v)=>put(p,{...docs.get(p),...v})
 const reviewed = () => {
  const checksum=sha('disclosed-synthetic-retained-checksum'), handle='a'.repeat(40), review='review-a'
  const lineage={...binding[0],ownerUid:uid,sourceReceiptRef:sourceId,requestedPurpose:'memory-index',jobId:'job-reviewed',
   transcriptRef:'private:transcripts/synthetic',provenanceRef:'private:provenance/synthetic',
   transcriptSha256:sha('synthetic-transcript'),provenanceSha256:sha('synthetic-provenance'),transcriptByteLength:28}
  put(prefix+'lifeModelReceipts/'+review,{ownerId:uid,schemaVersion:'urai-private-life-model-owner-review-v1',
   sourceHandleHash:handle,sourceRevision:1,sourceChecksum:checksum,syntheticOutputMayBecomeHistoricalSource:false})
  put('uraiPrivateLifeModel/'+handle+'/revisions/00000001',{ownerUid:uid,checksum,lineage})
  put(sourcePath+'/transcripts/'+sha(lineage.transcriptRef),{...lineage,schemaVersion:'urai-private-source-transcript-v2',
   ownerUid:uid,status:'CURRENT',synthetic:false})
  put('jobs/job-reviewed',{ownerUid:uid,consent:src.consent})
  put(prefix+'lifeCausalEdges/edge-a',{...edge,ownerId:uid,sourceBindingDigest:bind})
  for(const p of [prefix+'lifeEntities/person-a',prefix+'lifeEntities/event-a',prefix+'lifeClaims/claim-a',prefix+'lifeCausalEdges/edge-a']) {
   amend(p,{privateLifeModelReviewId:review,privateLifeModelRevision:1,privateLifeModelChecksum:checksum})
  }
  return {lineage,transcriptPath:sourcePath+'/transcripts/'+sha(lineage.transcriptRef)}
 }
 return {docs,put,amend,commits,call,graph,scene,edge,reviewed,conflict:fn=>{conflict=fn},get retries(){return retries}}
}

const state={id:'state-a',entityId:'person-a',asOf:'2000-01-01',claimIds:['claim-a'],relationshipContextIds:[],sourceIds:[sourceId],negativeConstraints:[],knowledgeCutoff:'2000-01-01'}
async function ready(){const f=fixture();await f.call('upsertLifeEntityState',state);return f}
test('actual valid source state and person bundle retain transaction-bound claims and stable hashes',async()=>{
 const f=await ready(),a=await f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'}),b=await f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'});
 assert.equal(a.bundleHash,b.bundleHash);assert.ok(f.docs.get(prefix+'personModelBundles/person-model:person-a:state-a').authorityBindings);
 assert.equal(f.docs.get(prefix+'lifeEntityStates/state-a').knowledgeCutoff,state.knowledgeCutoff);
})
for(const[name,mutate]of Object.entries({
 'model consent':f=>f.amend(prefix+'privacyPolicy/current',{domains:{}}),
 'revoked source':f=>f.amend(sourcePath,{status:'REVOKED'}),
 'changed source revision':f=>f.amend(sourcePath,{sourceRevision:2}),
 'foreign source':f=>f.amend(sourcePath,{ownerUid:'other'}),
 'owner deletion':f=>f.put('uraiPrivateLifeModelOwnerFences/'+sha(uid),{deleted:true}),
 'consent revocation':f=>f.put('jobConsentBlocks/'+sha(uid+'\n'+'memory.storage'),{active:true}),
 'foreign claim':f=>f.amend(prefix+'lifeClaims/claim-a',{ownerId:'other'}),
 'wrong subject':f=>f.amend(prefix+'lifeClaims/claim-a',{subjectEntityId:'event-a'}),
 'superseded claim':f=>f.amend(prefix+'lifeClaims/claim-a',{status:'superseded'}),
 'missing claim':f=>f.docs.delete(prefix+'lifeClaims/claim-a'),
 'unbound claim':f=>f.amend(prefix+'lifeClaims/claim-a',{sourceBindingDigest:undefined}),
 'synthetic claim':f=>f.amend(prefix+'lifeClaims/claim-a',{synthetic:true}),
 'revoked person':f=>f.amend(prefix+'lifeEntities/person-a',{revoked:true}),
})){
 test(name+' denies temporal state without writes',async()=>{const f=fixture();mutate(f);await assert.rejects(f.call('upsertLifeEntityState',state));assert.equal(f.docs.has(prefix+'lifeEntityStates/state-a'),false)});
 test(name+' denies person bundle even when state remains stored',async()=>{const f=await ready();mutate(f);await assert.rejects(f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'}));assert.equal(f.docs.has(prefix+'personModelBundles/person-model:person-a:state-a'),false)});
}
test('claim correction before asynchronous invalidation denies stale person state',async()=>{
 const f=await ready();f.amend(prefix+'lifeClaims/claim-a',{value:'corrected',valueDigest:sha(JSON.stringify('corrected'))});
 await assert.rejects(f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'}),/PERSON_STATE_DEPENDENCY_CHANGED/);
 await f.call('upsertLifeEntityState',state);const a=await f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'});assert.ok(a.bundleHash);
})
test('state upsert transaction conflict retries against revoked consent without committing state',async()=>{
 const f=fixture();f.conflict(()=>f.put('jobConsentBlocks/'+sha(uid+'\n'+'memory.storage'),{active:true}));
 await assert.rejects(f.call('upsertLifeEntityState',state));assert.equal(f.retries,1);assert.equal(f.docs.has(prefix+'lifeEntityStates/state-a'),false);
})
test('bundle transaction conflict retries against corrected claim without committing bundle',async()=>{
 const f=await ready();f.conflict(()=>f.amend(prefix+'lifeClaims/claim-a',{value:'corrected',valueDigest:sha(JSON.stringify('corrected'))}));
 await assert.rejects(f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'}));assert.equal(f.retries,1);assert.equal(f.docs.has(prefix+'personModelBundles/person-model:person-a:state-a'),false);
})
test('overwriting state resets explicitly removed cutoff instead of retaining prior merged value',async()=>{
 const f=await ready();await f.call('upsertLifeEntityState',{...state,knowledgeCutoff:null});assert.equal(f.docs.get(prefix+'lifeEntityStates/state-a').knowledgeCutoff,null);
})
test('foreign state identity and missing relationship cannot be overwritten or silently retained',async()=>{
 const f=fixture();f.put(prefix+'lifeEntityStates/state-a',{ownerId:'other'});await assert.rejects(f.call('upsertLifeEntityState',state));assert.equal(f.docs.get(prefix+'lifeEntityStates/state-a').ownerId,'other');
 const r=fixture();await assert.rejects(r.call('upsertLifeEntityState',{...state,relationshipContextIds:['edge-missing']}));
})

async function compiled(){const f=await ready();await f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'});await f.call('compileLifeCausalGraphSnapshot',f.graph);
 const scene={...f.scene,personModelBundleIds:['person-model:person-a:state-a']};await f.call('compileSceneTruthPacket',scene);
 f.put(prefix+'memories/memory-a',{ownerId:uid,lifeMovie:{sceneTruthPacketId:'scene-a',personModelBundleIds:scene.personModelBundleIds}});return {f,scene};}
test('actual SceneTruth and Replay consume current source-bound temporal bundle',async()=>{const {f}=await compiled();assert.equal((await f.call('getReplayLifeModelAuthority',{memoryId:'memory-a'})).available,true)})
for(const[name,mutate]of Object.entries({
 'changed temporal cutoff':f=>f.amend(prefix+'lifeEntityStates/state-a',{knowledgeCutoff:'2099-01-01'}),
 'revoked current source':f=>f.amend(sourcePath,{status:'REVOKED'}),
 'changed source content':f=>f.amend(sourcePath,{sourceSha256:sha('changed')}),
 'missing bound state':f=>f.docs.delete(prefix+'lifeEntityStates/state-a'),
 'legacy unbound bundle':f=>f.amend(prefix+'personModelBundles/person-model:person-a:state-a',{authorityBindings:undefined}),
 'foreign bound dependency':f=>f.amend(prefix+'lifeEntityStates/state-a',{ownerId:'other'}),
})){
 test(name+' denies SceneTruth and Replay before asynchronous invalidation',async()=>{const{f,scene}=await compiled();mutate(f);await assert.rejects(f.call('compileSceneTruthPacket',scene));await assert.rejects(f.call('getReplayLifeModelAuthority',{memoryId:'memory-a'}));})
}
test('Replay consent race retries then rejects without returning stale authority',async()=>{const{f}=await compiled();f.conflict(()=>f.amend(prefix+'privacyPolicy/current',{domains:{}}));await assert.rejects(f.call('getReplayLifeModelAuthority',{memoryId:'memory-a'}));assert.equal(f.retries,1)})
const correction={correctionId:'correction-a',targetClaimId:'claim-a',replacementClaimId:'claim-b',sourceIds:['psr_qrstuvwxyzabcdef'],evidenceClass:'DIRECT_SUBJECT_TESTIMONY',replacementValue:'Disclosed synthetic corrected testimony'}
function testimony(){const f=fixture(),id=correction.sourceIds[0];f.put('uraiPrivateSourceReceipts/'+sha(id),{...f.docs.get(sourcePath),sourceReceiptRef:id,sourceHandle:'psh_qrstuvwxyzabcdef',sourceEvidenceClass:'DIRECT_SUBJECT_TESTIMONY'});return f}
test('actual authorized testimony correction retains original and binds replacement source',async()=>{const f=testimony();await f.call('applyLifeCorrection',correction);assert.equal(f.docs.get(prefix+'lifeClaims/claim-a').status,'superseded');assert.match(f.docs.get(prefix+'lifeClaims/claim-b').sourceBindingDigest,/^[a-f0-9]{64}$/);assert.equal(f.docs.get(prefix+'lifeClaims/claim-b').historicalSourceAuthority,false)})
for(const[name,mutate]of Object.entries({
 'missing correction source':f=>f.docs.delete('uraiPrivateSourceReceipts/'+sha(correction.sourceIds[0])),
 'wrong evidence class':f=>f.amend('uraiPrivateSourceReceipts/'+sha(correction.sourceIds[0]),{sourceEvidenceClass:'SOURCE_CAPTURED'}),
 'foreign testimony':f=>f.amend('uraiPrivateSourceReceipts/'+sha(correction.sourceIds[0]),{ownerUid:'other'}),
 'revoked model consent':f=>f.amend(prefix+'privacyPolicy/current',{domains:{}}),
 'deleted owner':f=>f.put('uraiPrivateLifeModelOwnerFences/'+sha(uid),{deleted:true}),
 'revoked target source':f=>f.amend(sourcePath,{status:'REVOKED'}),
})){
 test(name+' denies correction without superseding target or accepting replacement',async()=>{const f=testimony();mutate(f);await assert.rejects(f.call('applyLifeCorrection',correction));assert.equal(f.docs.get(prefix+'lifeClaims/claim-a').status,'accepted');assert.equal(f.docs.has(prefix+'lifeClaims/claim-b'),false)})
}
test('correction consent race retries without accepting replacement',async()=>{const f=testimony();f.conflict(()=>f.put('jobConsentBlocks/'+sha(uid+'\n'+'memory.storage'),{active:true}));await assert.rejects(f.call('applyLifeCorrection',correction));assert.equal(f.retries,1);assert.equal(f.docs.has(prefix+'lifeClaims/claim-b'),false)})

test('relationship changes after state creation deny compiler before asynchronous invalidation',async()=>{
 const f=fixture();f.reviewed();await f.call('upsertLifeEntityState',{...state,relationshipContextIds:['edge-a']});
 const a=await f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'});assert.ok(a.bundleHash);
 f.amend(prefix+'lifeCausalEdges/edge-a',{kind:'CAUSED'});await assert.rejects(f.call('compilePersonModelBundle',{personId:'person-a',stateId:'state-a'}));
})
test('negative constraint sources must be included in declared state source set',async()=>{
 const f=testimony();await assert.rejects(f.call('upsertLifeEntityState',{...state,negativeConstraints:[{id:'constraint-a',rule:'NO_FUTURE_KNOWLEDGE',sourceIds:correction.sourceIds}]}),/STATE_SOURCE_SET_INCOMPLETE/);
})
