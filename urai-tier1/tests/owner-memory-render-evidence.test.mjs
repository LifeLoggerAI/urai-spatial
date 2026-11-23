import assert from 'node:assert/strict'
import test from 'node:test'
import {readOwnerMemoryEvidence, readOwnerMemoryRenderEvidence as readRender} from '../src/lib/server/owner-memory-evidence.ts'
import {resolveCurrentOwnerBoundStudioRender as resolve} from '../src/spatial/memory/ownerBoundStudioRenderResolver.ts'

const uid='ownerA', memoryId='memoryA', manifestId='manifestA'
const memoryPath=`users/${uid}/memories/${memoryId}`
const policyPath=`users/${uid}/privacyPolicy/current`
function fixture(){
  const records={
    [memoryPath]:{ownerId:uid,deleted:false,demo:false,consentState:'granted',
      replayManifest:{id:manifestId,version:7},sourceMedia:[{url:'gs://never-output-this'}]},
    [policyPath]:{ownerId:uid,domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'}}
  }
  const paths=[]
  const reader={doc(path){paths.push(path);return {async get(){return {exists:Object.hasOwn(records,path),data:()=>records[path]}}}}}
  const input={verifiedOwnerUid:uid,memoryId,expectedManifestId:manifestId}
  return {records,paths,reader,input}
}

test('R1715 legacy read remains minimal (no version or source media)',async()=>{
  const f=fixture()
  assert.deepEqual(await readOwnerMemoryEvidence(f.input,f.reader),{status:'ready',selectedMemory:{
    id:memoryId,ownerId:uid,deleted:false,demo:false,replayManifest:{id:manifestId}
  }})
  assert.deepEqual(f.paths,[memoryPath,policyPath])
})
test('R1715 provenance read returns exact stored manifest version from same paired read',async()=>{
  const f=fixture()
  const result=await readRender(f.input,f.reader)
  assert.deepEqual(result,{status:'ready',selectedMemory:{id:memoryId,ownerId:uid,
    deleted:false,demo:false,replayManifest:{id:manifestId,version:7}}})
  assert.deepEqual(f.paths,[memoryPath,policyPath])
  assert.doesNotMatch(JSON.stringify(result),/sourceMedia|gs:\/\/|jobId|token|playback|url/i)
})
test('R1715 version 1 explicit is valid, no inferred version default',async()=>{
  const f=fixture();f.records[memoryPath].replayManifest.version=1
  assert.equal((await readRender(f.input,f.reader)).selectedMemory?.replayManifest.version,1)
})
for (const [name,version] of [
  ['missing',undefined],['zero',0],['negative',-1],['fraction',1.1],['string','7'],
  ['null',null],['infinite',Infinity],['NaN',NaN],['unsafe integer',Number.MAX_SAFE_INTEGER+1]
]) test('R1715 deny unverified manifest version: '+name,async()=>{
  const f=fixture()
  if (version===undefined)delete f.records[memoryPath].replayManifest.version
  else f.records[memoryPath].replayManifest.version=version
  const value=await readRender(f.input,f.reader)
  assert.equal(value.status,'unavailable')
  assert.equal('selectedMemory' in value,false)
  assert.deepEqual(f.paths,[memoryPath,policyPath])
})
for (const [name,change] of [
  ['wrong owner',f=>{f.records[memoryPath].ownerId='other'}],
  ['wrong manifest',f=>{f.records[memoryPath].replayManifest.id='other'}],
  ['memory deleted',f=>{f.records[memoryPath].deleted=true}],
  ['memory deletion state missing',f=>{delete f.records[memoryPath].deleted}],
  ['explicit demo',f=>{f.records[memoryPath].demo=true}],
  ['revoked memory consent',f=>{f.records[memoryPath].consentState='revoked'}],
  ['pending memory consent',f=>{f.records[memoryPath].consentState='pending'}],
  ['no memory',f=>{delete f.records[memoryPath]}],
  ['policy revoked',f=>{f.records[policyPath].domains.memory.mode='revoked'}],
  ['policy pending',f=>{f.records[policyPath].enforcement.state='pending'}],
  ['policy not fully enforced',f=>{f.records[policyPath].enforcement.state='partially-enforced'}],
  ['policy wrong owner',f=>{f.records[policyPath].ownerId='other'}],
  ['no policy',f=>{delete f.records[policyPath]}],
]) test('R1715 render projection retains original consent denial: '+name,async()=>{
  const f=fixture();change(f)
  const val=await readRender(f.input,f.reader)
  assert.equal(val.status,'unavailable');assert.equal('selectedMemory' in val,false)
})
for(const [name,key,value] of [
  ['untrusted owner','verifiedOwnerUid','../ownerA'],
  ['untrusted memory','memoryId','../memoryA'],
  ['untrusted manifest','expectedManifestId','manifest/foreign'],
  ['missing owner','verifiedOwnerUid',null],
  ['missing memory','memoryId',null],
]) test('R1715 deny invalid path input before querying backend: '+name,async()=>{
  const f=fixture();f.input[key]=value
  const val=await readRender(f.input,f.reader)
  assert.equal(val.status,'unavailable');assert.deepEqual(f.paths,[])
})
test('R1715 backend failures deny without leaking provider errors',async()=>{
  const f=fixture();f.reader.doc=()=>({get:async()=>{throw Error('project-secret')}})
  const val=await readRender(f.input,f.reader)
  assert.equal(val.status,'unavailable')
  assert.doesNotMatch(JSON.stringify(val),/project-secret/)
})

/** Pure reader-injection seam ONLY. Fake grant and Jobs records are synthetic,
 * NOT verified/approved issuers and must never be registered for production. */
function resolverReaders(f){
  const jobId='render_1234567890', tenantId='studio01', digest='a'.repeat(64),receipt='b'.repeat(64)
  return {
    currentVerifiedIdentity:async()=>({uid,tenantId}),
    readCurrentStudioAuthority:async()=>({ownerUid:uid,tenantId,
      studioUser:{uid,role:'owner',disabled:false,revoked:false},
      membership:{uid,studioId:tenantId,role:'creator',active:true,disabled:false,revoked:false},
      ownerDeletionFenced:false,deletionTombstoneFenced:false}),
    readOwnerMemory:async(u,mem,manifest)=>{
      const v=await readRender({verifiedOwnerUid:u,memoryId:mem,expectedManifestId:manifest},f.reader)
      return v.status==='ready'?v.selectedMemory:null
    },
    readProtectedBinding:async()=>({authority:'protected-server-record',sourceSystem:'urai-jobs',
      ownerUid:uid,tenantId,memoryId,replayManifestId:manifestId,manifestVersion:7,
      jobId,jobType:'studio.render.video',renderPlanDigest:digest,decisionReceiptId:receipt,revoked:false}),
    readCurrentRenderGrant:async()=>({issuer:'urai-privacy',ownerUid:uid,tenantId,purpose:'life-movie.render',
      policyVersion:'1.1.0',decisionReceiptId:receipt,status:'granted',revoked:false}),
    readOwnerDeletionFence:async()=>false,
    readBoundJobsRecord:async()=>({jobId,ownerUid:uid,tenantId,sourceSystem:'urai-studio',
      jobType:'studio.render.video',status:'SUCCESS',outputDeletedAt:null,
      output:{renderPlanDigest:digest},consent:{purpose:'life-movie.render',
      policyVersion:'1.1.0',decisionReceiptId:receipt}}),
  }
}
test('R1715 synthetic resolver seam uses the actually stored manifest version',async()=>{
  const f=fixture()
  const val=await resolve({memoryId,manifestId},resolverReaders(f))
  assert.deepEqual(val,{status:'candidate',tenantId:'studio01',jobId:'render_1234567890'})
  assert.deepEqual(f.paths,[memoryPath,policyPath,memoryPath,policyPath])
})
test('R1715 missing version cannot be promoted to render reference, even with fake grants',async()=>{
  const f=fixture();delete f.records[memoryPath].replayManifest.version
  const val=await resolve({memoryId,manifestId},resolverReaders(f))
  assert.equal(val.status,'unavailable')
})
test('R1715 manifest version drift between two protected reads fails closed',async()=>{
  const f=fixture()
  let reads=0;const original=f.reader.doc
  f.reader.doc=(path)=>{
    const r=original.call(f.reader,path)
    if(path!==memoryPath)return r
    return {async get(){const v=await r.get();if(++reads===2)f.records[memoryPath].replayManifest.version=8;return v}}
  }
  const val=await resolve({memoryId,manifestId},resolverReaders(f))
  assert.equal(val.status,'unavailable')
})
test('R1715 policy revoked between two protected reads fails closed',async()=>{
  const f=fixture()
  let reads=0;const original=f.reader.doc
  f.reader.doc=(path)=>{
    const r=original.call(f.reader,path)
    if(path!==policyPath)return r
    return {async get(){const v=await r.get();if(++reads===2)f.records[policyPath].domains.memory.mode='revoked';return v}}
  }
  const val=await resolve({memoryId,manifestId},resolverReaders(f))
  assert.equal(val.status,'unavailable')
})
