import assert from 'node:assert/strict'
import test from 'node:test'
import { readOwnerMemoryEvidence as read } from '../src/lib/server/owner-memory-evidence.ts'
function fixture(){
 const docs={
  'users/ownerA/memories/memoryA': {ownerId:'ownerA',replayManifest:{id:'manifestA'},deleted:false,demo:false},
  'users/ownerA/privacyPolicy/current':{ownerId:'ownerA',domains:{memory:{mode:'granted'}},enforcement:{state:'fully-enforced'}}
 }
 const paths=[]
 const reader={doc(path){ paths.push(path);if(!Object.hasOwn(docs,path))return {get:async()=>({exists:false,data:()=>undefined})};return {get:async()=>({exists:true,data:()=>docs[path]})}}}
 return {docs,paths,reader,args:{verifiedOwnerUid:'ownerA',memoryId:'memoryA',expectedManifestId:'manifestA'}}
}
test('reads only current owner memory and policy from fixed document paths',async()=>{
 const v=fixture();const r=await read(v.args,v.reader)
 assert.deepEqual(r,{status:'ready',selectedMemory:{id:'memoryA',ownerId:'ownerA',deleted:false,demo:false,replayManifest:{id:'manifestA'}}})
 assert.deepEqual(v.paths,['users/ownerA/memories/memoryA','users/ownerA/privacyPolicy/current'])
 assert.equal(JSON.stringify(r).includes('sourceMedia'),false)
})
const cases=[
 ['wrong owner',v=>v.args.verifiedOwnerUid='otherOwner'],
 ['path injection owner',v=>v.args.verifiedOwnerUid='../ownerA'],
 ['path injection memory',v=>v.args.memoryId='foo/bar'],
 ['bad manifest identifier',v=>v.args.expectedManifestId='abc/def'],
 ['missing manifest',v=>v.args.expectedManifestId=''],
 ['absent memory',v=>delete v.docs['users/ownerA/memories/memoryA']],
 ['absent policy',v=>delete v.docs['users/ownerA/privacyPolicy/current']],
 ['policy wrong owner',v=>v.docs['users/ownerA/privacyPolicy/current'].ownerId='otherOwner'],
 ['memory policy revoked',v=>v.docs['users/ownerA/privacyPolicy/current'].domains.memory.mode='revoked'],
 ['memory policy partial',v=>v.docs['users/ownerA/privacyPolicy/current'].enforcement.state='partially-enforced'],
 ['memory policy pending',v=>v.docs['users/ownerA/privacyPolicy/current'].enforcement.state='pending'],
 ['memory deleted',v=>v.docs['users/ownerA/memories/memoryA'].deleted=true],
 ['memory deletion state absent',v=>delete v.docs['users/ownerA/memories/memoryA'].deleted],
 ['memory owner mismatch',v=>v.docs['users/ownerA/memories/memoryA'].ownerId='someoneElse'],
 ['memory consent revoked',v=>v.docs['users/ownerA/memories/memoryA'].consentState='revoked'],
 ['memory consent pending',v=>v.docs['users/ownerA/memories/memoryA'].consentState='pending'],
 ['memory demo',v=>v.docs['users/ownerA/memories/memoryA'].demo=true],
 ['missing replay manifest',v=>delete v.docs['users/ownerA/memories/memoryA'].replayManifest],
 ['wrong replay manifest',v=>v.docs['users/ownerA/memories/memoryA'].replayManifest.id='anotherManifest']
]
for(const [name,edit] of cases)test('fail closed: '+name,async()=>{
 const v=fixture();edit(v);const result=await read(v.args,v.reader)
 assert.equal(result.status,'unavailable')
 assert.equal('selectedMemory' in result,false)
})
test('database read failure is denied, never cached',async()=>{
 const v=fixture();v.reader.doc=()=>({get:async()=>{throw Error('read denied')}})
 assert.equal((await read(v.args,v.reader)).status,'unavailable')
})
