import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {createOwnerMemoryNodeHttpHandler} from '../src/lib/server/owner-memory-node-http.ts'
import {handleAuthenticatedOwnerMemoryRequest} from '../src/lib/server/authenticated-owner-memory.ts'
import {readOwnerMemoryEvidence} from '../src/lib/server/owner-memory-evidence.ts'
async function withServer(handler,work){
 const s=createServer(handler)
 await new Promise(r=>s.listen(0,'127.0.0.1',r))
 try{await work('http://127.0.0.1:'+s.address().port)}
 finally{await new Promise(r=>s.close(r))}
}
test('local HTTP owner identity, selectors, consent and safe denials',async()=>{
 const docs={
 'users/ownerA/memories/memoryA':{ownerId:'ownerA',deleted:false,demo:false,replayManifest:{id:'manifestA'}},
 'users/ownerA/privacyPolicy/current':{ownerId:'ownerA',domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'}}
 }
 const reader={doc:path=>({get:async()=>({exists:Object.hasOwn(docs,path),data:()=>docs[path]})})}
 const deps={
 verifyOwner:async req=>({ 'Bearer ownerA':'ownerA','Bearer ownerB':'ownerB' }[req.headers.get('authorization')]??null),
 readOwnerMemory:readOwnerMemoryEvidence,reader:async()=>reader}
 const handler=createOwnerMemoryNodeHttpHandler(req=>handleAuthenticatedOwnerMemoryRequest(req,deps))
 await withServer(handler,async origin=>{
 const path='/internal/owner-memory?memoryId=memoryA&manifestId=manifestA'
 async function check(suffix,token,status,code,method='GET'){
  const r=await fetch(origin+suffix,{method,headers:token?{authorization:'Bearer '+token}:{}})
  const body=await r.json()
  assert.equal(r.status,status);assert.equal(body.code,code)
  assert.match(r.headers.get('cache-control'),/no-store/)
  assert.equal(r.headers.get('x-content-type-options'),'nosniff')
  assert.ok(!JSON.stringify(body).includes('signedUrl'))
  return body
 }
 assert.deepEqual(await check(path,'ownerA',200,'memory_identity_verified'),{
 ok:true,code:'memory_identity_verified',memoryId:'memoryA',manifestId:'manifestA'})
 await check(path,'ownerB',404,'memory_unavailable')
 await check(path,null,401,'unauthorized')
 await check(path+'&ownerUid=other','ownerA',400,'invalid_selection')
 await check(path+'&tenantId=other','ownerA',400,'invalid_selection')
 await check(path,'ownerA',405,'method_not_allowed','POST')
 await check('/internal/else','ownerA',404,'not_found')
 docs['users/ownerA/privacyPolicy/current'].domains.memory.mode='revoked'
 await check(path,'ownerA',404,'memory_unavailable')
 })
})
test('HTTP exceptions never leak provider details',async()=>{
 await withServer(createOwnerMemoryNodeHttpHandler(async()=>{throw Error('provider secret')}),async origin=>{
 const r=await fetch(origin+'/internal/owner-memory?memoryId=a&manifestId=b')
 assert.equal(r.status,503)
 assert.deepEqual(await r.json(),{ok:false,code:'protected_read_unavailable'})
 assert.match(r.headers.get('cache-control'),/no-store/)
 })
})

test('R1708 HTTP rejects a bearer revoked after initial protected read',async()=>{
 const docs={
  'users/ownerA/memories/memoryA':{ownerId:'ownerA',deleted:false,demo:false,replayManifest:{id:'manifestA'}},
  'users/ownerA/privacyPolicy/current':{ownerId:'ownerA',domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'}},
 }
 let authChecks=0
 const deps={
  verifyOwner:async()=>++authChecks===1?'ownerA':null,
  readOwnerMemory:readOwnerMemoryEvidence,
  reader:async()=>({doc:path=>({get:async()=>({exists:Object.hasOwn(docs,path),data:()=>docs[path]})})}),
 }
 await withServer(createOwnerMemoryNodeHttpHandler(req=>handleAuthenticatedOwnerMemoryRequest(req,deps)),async origin=>{
  const r=await fetch(origin+'/internal/owner-memory?memoryId=memoryA&manifestId=manifestA',{headers:{authorization:'Bearer original'}})
  assert.equal(r.status,401)
  assert.deepEqual(await r.json(),{ok:false,code:'unauthorized'})
  assert.equal(authChecks,2)
 })
})

test('R1708 HTTP rejects policy revoked between protected reads',async()=>{
 const docs={
  'users/ownerA/memories/memoryA':{ownerId:'ownerA',deleted:false,demo:false,replayManifest:{id:'manifestA'}},
  'users/ownerA/privacyPolicy/current':{ownerId:'ownerA',domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'}},
 }
 let reads=0
 const deps={
  verifyOwner:async()=> 'ownerA',
  readOwnerMemory:async (...args)=>{
    const v=await readOwnerMemoryEvidence(...args)
    if(++reads===1)docs['users/ownerA/privacyPolicy/current'].domains.memory.mode='revoked'
    return v
  },
  reader:async()=>({doc:path=>({get:async()=>({exists:Object.hasOwn(docs,path),data:()=>docs[path]})})}),
 }
 await withServer(createOwnerMemoryNodeHttpHandler(req=>handleAuthenticatedOwnerMemoryRequest(req,deps)),async origin=>{
  const r=await fetch(origin+'/internal/owner-memory?memoryId=memoryA&manifestId=manifestA',{headers:{authorization:'Bearer original'}})
  assert.equal(r.status,404)
  assert.deepEqual(await r.json(),{ok:false,code:'memory_unavailable'})
  assert.equal(reads,2)
 })
})
