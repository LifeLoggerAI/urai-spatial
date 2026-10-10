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
    set:(r,v,o)=>writes.push({r,v,o})}
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
test('actual graph producer and SceneTruth consumer bind protected canonical content and stable repeated delivery',async()=>{
 const f=fixture(),a=await f.call('compileLifeCausalGraphSnapshot',f.graph),b=await f.call('compileLifeCausalGraphSnapshot',f.graph)
 assert.equal(a.graphHash,b.graphHash)
 const scene=await f.call('compileSceneTruthPacket',f.scene);assert.equal(scene.decision,'READY')
 const row=f.docs.get(prefix+'sceneTruthPackets/scene-a')
 assert.equal(row.graphHash,a.graphHash);assert.equal(row.syntheticOutputMayBecomeHistoricalSource,false)
 assert.ok(f.docs.get(prefix+'lifeGraphSnapshots/graph-a').dependencyIds.includes(sourceId))
})
test('same IDs with corrected claim content change graph authority hash',async()=>{
 const f=fixture(),a=await f.call('compileLifeCausalGraphSnapshot',f.graph)
 f.amend(prefix+'lifeClaims/claim-a',{value:'corrected',valueDigest:sha(JSON.stringify('corrected'))})
 const b=await f.call('compileLifeCausalGraphSnapshot',f.graph);assert.notEqual(a.graphHash,b.graphHash)
})
for(const [name,mutate]of Object.entries({
 'source revocation':f=>f.amend(sourcePath,{status:'REVOKED'}),
 'source correction':f=>f.amend(sourcePath,{sourceRevision:2}),
 'foreign source owner':f=>f.amend(sourcePath,{ownerUid:'other'}),
 'synthetic source':f=>f.amend(sourcePath,{synthetic:true}),
 'consent withdrawal':f=>f.put('jobConsentBlocks/'+sha(uid+'\n'+'memory.storage'),{active:true}),
 'owner deletion':f=>f.put('uraiPrivateLifeModelOwnerFences/'+sha(uid),{deleted:true}),
 'foreign entity owner':f=>f.amend(prefix+'lifeEntities/person-a',{ownerId:'other'}),
 'synthetic entity':f=>f.amend(prefix+'lifeEntities/person-a',{synthetic:true}),
 'synthetic claim':f=>f.amend(prefix+'lifeClaims/claim-a',{synthetic:true}),
 'unselected claim subject':f=>f.amend(prefix+'lifeClaims/claim-a',{subjectEntityId:'person-unselected'}),
 'missing dependency':f=>f.docs.delete(prefix+'lifeClaims/claim-a'),
 'unbound source':f=>f.amend(prefix+'lifeClaims/claim-a',{sourceBindingDigest:undefined}),
})){
 test(name+' blocks graph publication without writes',async()=>{const f=fixture();mutate(f);await assert.rejects(f.call('compileLifeCausalGraphSnapshot',f.graph));assert.equal(f.commits.length,0)})
 test(name+' blocks SceneTruth despite graph still labelled current',async()=>{const f=fixture();await f.call('compileLifeCausalGraphSnapshot',f.graph);mutate(f);await assert.rejects(f.call('compileSceneTruthPacket',f.scene));assert.equal(f.docs.has(prefix+'sceneTruthPackets/scene-a'),false)})
}
test('source revocation between graph reads and commit retries then rejects all staged writes',async()=>{
 const f=fixture();f.conflict(()=>f.amend(sourcePath,{status:'REVOKED'}))
 await assert.rejects(f.call('compileLifeCausalGraphSnapshot',f.graph));assert.equal(f.retries,1);assert.equal(f.docs.has(prefix+'lifeGraphSnapshots/graph-a'),false)
})
test('claim correction before asynchronous invalidation blocks stale SceneTruth',async()=>{
 const f=fixture();await f.call('compileLifeCausalGraphSnapshot',f.graph);f.amend(prefix+'lifeClaims/claim-a',{value:'corrected',valueDigest:sha(JSON.stringify('corrected'))})
 await assert.rejects(f.call('compileSceneTruthPacket',f.scene),/GRAPH_DEPENDENCY_CHANGED/)
})
test('SceneTruth transaction rejects model policy changed during publication',async()=>{
 const f=fixture();await f.call('compileLifeCausalGraphSnapshot',f.graph)
 f.conflict(()=>f.amend(prefix+'privacyPolicy/current',{domains:{}}))
 await assert.rejects(f.call('compileSceneTruthPacket',f.scene));assert.equal(f.retries,1);assert.equal(f.docs.has(prefix+'sceneTruthPackets/scene-a'),false)
})
test('edge upsert binds protected source and rejects revoked sources and endpoint transaction races',async()=>{
 const f=fixture();f.reviewed();await f.call('upsertLifeCausalEdge',f.edge);assert.match(f.docs.get(prefix+'lifeCausalEdges/edge-a').sourceBindingDigest,/^[a-f0-9]{64}$/)
 const bad=fixture();bad.amend(sourcePath,{status:'REVOKED'});await assert.rejects(bad.call('upsertLifeCausalEdge',bad.edge))
 const race=fixture();race.reviewed();race.conflict(()=>race.amend(prefix+'lifeEntities/event-a',{revoked:true}));await assert.rejects(race.call('upsertLifeCausalEdge',race.edge));assert.equal(race.retries,1)
})
test('synthetic edge cannot enter historical graph even with valid sources',async()=>{
 const f=fixture();await assert.rejects(f.call('upsertLifeCausalEdge',{...f.edge,synthetic:true}),/SYNTHETIC_OUTPUT/)
 assert.equal(f.docs.has(prefix+'lifeCausalEdges/edge-a'),false)
})
test('unknown SceneTruth source cannot be substituted and simulation remains interpretive',async()=>{
 const f=fixture();await f.call('compileLifeCausalGraphSnapshot',f.graph)
 await assert.rejects(f.call('compileSceneTruthPacket',{...f.scene,sourceIds:['psr_qrstuvwxyzabcdef']}),/LINEAGE_MISMATCH/)
 assert.equal((await f.call('compileSceneTruthPacket',{...f.scene,presentationClass:'SIMULATED'})).decision,'READY_INTERPRETIVE')
 assert.equal(f.docs.get(prefix+'sceneTruthPackets/scene-a').syntheticOutputMayBecomeHistoricalSource,false)
})
test('authentication and foreign owner requests cannot create canonical graph or edges',async()=>{
 const f=fixture();await assert.rejects(f.call('compileLifeCausalGraphSnapshot',f.graph,null));await assert.rejects(f.call('upsertLifeCausalEdge',f.edge,'other'));assert.equal(f.commits.length,0)
})
test('owner-reviewed canonical producer records enter graph and deny stale transcript corrections',async()=>{
 const f=fixture(),review=f.reviewed();await f.call('compileLifeCausalGraphSnapshot',f.graph)
 await f.call('compileSceneTruthPacket',f.scene)
 f.amend(review.transcriptPath,{transcriptSha256:sha('corrected-transcript')})
 await assert.rejects(f.call('compileSceneTruthPacket',f.scene),/GRAPH_REVIEW_TRANSCRIPT_CHANGED/)
})
test('caller syntheticfalse cannot confer SOURCE_DERIVED or captured historical claim authority',async()=>{
 for(const evidenceClass of ['SOURCE_CAPTURED','SOURCE_DERIVED','DIRECT_SUBJECT_TESTIMONY']) {
  const f=fixture()
  await assert.rejects(f.call('upsertLifeClaim',{id:'generated-a',subjectEntityId:'person-a',predicate:'statement',
   value:'Disclosed synthetic generated content',evidenceClass,confidence:'confirmed',status:'accepted',synthetic:false,sourceIds:[sourceId]}),/OWNER_REVIEW_REQUIRED/)
  assert.equal(f.docs.has(prefix+'lifeClaims/generated-a'),false)
 }
})
test('exact owner-reviewed historical content may replay but caller edits require a new correction',async()=>{
 const f=fixture();f.reviewed();const row=f.docs.get(prefix+'lifeClaims/claim-a')
 assert.equal((await f.call('upsertLifeClaim',row)).idempotent,true)
 await assert.rejects(f.call('upsertLifeClaim',{...row,value:'Disclosed synthetic simulation copied into claim'}),/CONTENT_MISMATCH/)
 assert.equal(f.docs.get(prefix+'lifeClaims/claim-a').value,'synthetic-role')
})
test('owner assertion remains explicitly disputed unknown and cannot replace reviewed historical claims',async()=>{
 const f=fixture(),row={id:'assertion-a',subjectEntityId:'person-a',predicate:'reflection',value:'Owner reflection',
  evidenceClass:'UNKNOWN',confidence:'unknown',status:'disputed',synthetic:false,sourceIds:[]}
 await f.call('upsertLifeClaim',row)
 const saved=f.docs.get(prefix+'lifeClaims/assertion-a')
 assert.equal(saved.historicalSourceAuthority,false);assert.equal(saved.syntheticOutputMayBecomeHistoricalSource,false)
 await assert.rejects(f.call('upsertLifeClaim',{...row,status:'accepted',confidence:'confirmed'}),/NONHISTORICAL/)
 f.reviewed();await assert.rejects(f.call('upsertLifeClaim',{...row,id:'claim-a'}),/REQUIRES_CORRECTION/)
})
test('caller flags cannot confer historical edge authority or change a reviewed causal assertion',async()=>{
 const f=fixture();await assert.rejects(f.call('upsertLifeCausalEdge',f.edge),/OWNER_REVIEW_REQUIRED/)
 f.reviewed();await assert.rejects(f.call('upsertLifeCausalEdge',{...f.edge,kind:'CAUSED'}),/CONTENT_MISMATCH/)
 assert.equal(f.docs.get(prefix+'lifeCausalEdges/edge-a').kind,'PARTICIPATED_IN')
})
