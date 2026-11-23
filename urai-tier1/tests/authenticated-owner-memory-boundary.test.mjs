import test from 'node:test'
import assert from 'node:assert/strict'
import { handleAuthenticatedOwnerMemoryRequest as handle } from '../src/lib/server/authenticated-owner-memory.ts'
import { readOwnerMemoryEvidence } from '../src/lib/server/owner-memory-evidence.ts'
function fixture(){
 const docs={
  'users/ownerA/memories/memoryA':{ownerId:'ownerA',deleted:false,demo:false,replayManifest:{id:'manifestA'}},
  'users/ownerA/privacyPolicy/current':{ownerId:'ownerA',domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'}},
 }
 const readPaths=[]; const reader={doc(path){readPaths.push(path);return{get:async()=>({exists:Object.hasOwn(docs,path),data:()=>docs[path]})}}}
 let verified=0,reads=0
 const deps={verifyOwner:async()=>{verified++;return'ownerA'},readOwnerMemory:readOwnerMemoryEvidence,reader:async()=>{reads++;return reader}}
 const request=(path='?memoryId=memoryA&manifestId=manifestA',token='Bearer verified.synthetic',method='GET')=>
   new Request('https://localhost/api/private/memory'+path,{method,headers:token?{authorization:token}:{}})
 return {docs,readPaths,deps,request,stats:()=>({verified,reads})}
}
test('valid owner returns only minimal IDs and no-store',async()=>{
 const f=fixture(),r=await handle(f.request(),f.deps),body=await r.json()
 assert.equal(r.status,200);assert.deepEqual(body,{ok:true,code:'memory_identity_verified',memoryId:'memoryA',manifestId:'manifestA'})
 assert.match(r.headers.get('cache-control'),/no-store/)
 assert.deepEqual(f.readPaths,['users/ownerA/memories/memoryA','users/ownerA/privacyPolicy/current'])
 assert.ok(!JSON.stringify(body).includes('studio'))
})
const rejects=[
 ['no bearer',f=>f.request(undefined,null),401],
 ['bad scheme',f=>f.request(undefined,'Basic token'),401],
 ['method POST',f=>f.request(undefined,undefined,'POST'),405],
 ['missing manifest',f=>f.request('?memoryId=memoryA'),400],
 ['missing memory',f=>f.request('?manifestId=manifestA'),400],
 ['duplicate memory',f=>f.request('?memoryId=memoryA&memoryId=memoryB&manifestId=manifestA'),400],
 ['duplicate manifest',f=>f.request('?memoryId=memoryA&manifestId=manifestA&manifestId=x'),400],
 ['client job',f=>f.request('?memoryId=memoryA&manifestId=manifestA&jobId=render_123'),400],
 ['client tenant',f=>f.request('?memoryId=memoryA&manifestId=manifestA&tenantId=someone'),400],
 ['client owner',f=>f.request('?memoryId=memoryA&manifestId=manifestA&ownerUid=other'),400],
 ['bad memory path',f=>f.request('?memoryId=..%2Ffoo&manifestId=manifestA'),404],
 ['bad manifest path',f=>f.request('?memoryId=memoryA&manifestId=..%2Ffoo'),404],
]
for(const [name,fn,status] of rejects)test('denies '+name,async()=>{
 const f=fixture(),r=await handle(fn(f),f.deps)
 assert.equal(r.status,status);assert.equal((await r.json()).ok,false)
 if(status!==404)assert.equal(f.stats().reads,0)
})
test('token verification failure cannot read Firestore',async()=>{
 const f=fixture();f.deps.verifyOwner=async()=>null;const r=await handle(f.request(),f.deps)
 assert.equal(r.status,401);assert.equal(f.stats().reads,0)
})
test('verification service failure is fail closed',async()=>{
 const f=fixture();f.deps.verifyOwner=async()=>{throw Error('auth down')}
 const r=await handle(f.request(),f.deps);assert.equal(r.status,503);assert.equal(f.stats().reads,0)
})
test('reader failure is fail closed',async()=>{
 const f=fixture();f.deps.reader=async()=>{throw Error('unavailable')}
 const r=await handle(f.request(),f.deps);assert.equal(r.status,503)
})
test('deleted memory is nonenumerating denied',async()=>{
 const f=fixture();f.docs['users/ownerA/memories/memoryA'].deleted=true
 const r=await handle(f.request(),f.deps)
 assert.equal(r.status,404);assert.deepEqual(await r.json(),{ok:false,code:'memory_unavailable'})
})
test('revoked policy is nonenumerating denied',async()=>{
 const f=fixture();f.docs['users/ownerA/privacyPolicy/current'].domains.memory.mode='revoked'
 const r=await handle(f.request(),f.deps)
 assert.equal(r.status,404);assert.deepEqual(await r.json(),{ok:false,code:'memory_unavailable'})
})
