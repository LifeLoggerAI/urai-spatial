import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createHash, webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const src = fs.readFileSync(new URL('../src/lib/privacy/ownedMemoryMediaClient.ts', import.meta.url), 'utf8')
const cjs = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }}).outputText
const bytes = Buffer.from([137,80,78,71,13,10,26,10,1,2,3])
const hash = createHash('sha256').update(bytes).digest('hex')
function fixture() {
 const calls=[]; let reads=0; const app={}; const auth={}; const memory={id:'private-memory',ownerId:'owner',privacy:'hidden'}
 const owner={uid:'owner',getIdTokenResult:async()=>({claims:{auth_time:Math.floor(Date.now()/1000)}})}; auth.currentUser=owner
 const authdata={schemaVersion:'urai-owned-memory-media-v1',ownerId:'owner',memoryId:'private-memory',consentRevision:3,expiresAt:Date.now()+50000}
 const success={receiptId:'a'.repeat(64),memoryId:'private-memory',state:'ready',sha256:hash,byteLength:bytes.length,contentType:'image/png'}
 const imports={'firebase/auth':{getAuth:()=>auth},'firebase/functions':{httpsCallable:(_f,name)=>async(data)=>{calls.push({name,data});return{data:name==='getMemoryMediaUploadAuthority'?authdata:success}}},'@/lib/firebase/client':{app,functions:{},firebasePublicEnvReady:true,getUraiAuth:()=>auth}}
 const module={exports:{}}
 const context={module,exports:module.exports,require:name=>{assert.ok(name in imports, 'unexpected import '+name);return imports[name]},DOMException,Uint8Array,Date,btoa,crypto:webcrypto,navigator:{onLine:true}}
 vm.runInNewContext(cjs,context)
 const file={size:bytes.length,type:'image/png',arrayBuffer:async()=>{reads++;return Uint8Array.from(bytes).buffer}}
 const controller=new AbortController(); const life={signal:controller.signal,isCurrent:()=>true}
 return {memory,auth,owner,calls,reads:()=>reads,file,life,run:(digest)=>module.exports.attachOwnedMemoryFile(memory,file,life,'synthetic-preflight',digest)}
}
test('prepared bytes match original receipt and register only after two current C1 reads', async()=>{
 const f=fixture();const r=await f.run(hash)
 assert.equal(r.receiptId,'a'.repeat(64))
 assert.deepEqual(f.calls.map(x=>x.name),['getMemoryMediaUploadAuthority','getMemoryMediaUploadAuthority','registerMemoryMedia'])
 assert.equal(f.reads(),1)
})
test('modified same-size bytes cannot be registered after offline preparation',async()=>{
 const f=fixture();const wrong='b'.repeat(64)
 await assert.rejects(f.run(wrong),/PREPARED_MEDIA_FIXITY_CHANGED/)
 assert.deepEqual(f.calls.map(x=>x.name),['getMemoryMediaUploadAuthority'])
 assert.equal(f.reads(),1)
})
test('malformed source receipt is rejected before network or reading sensitive file',async()=>{
 const f=fixture();await assert.rejects(f.run('INVALID'),/PREPARED_MEDIA_FIXITY_INVALID/)
 assert.equal(f.calls.length,0);assert.equal(f.reads(),0)
})
test('current ordinary owner attachment remains compatible without prepared receipt',async()=>{
 const f=fixture();const r=await f.run(undefined)
 assert.equal(r.memoryId,'private-memory')
 assert.equal(f.calls.length,3)
})
test('actor change after first consent authority denies before upload registration',async()=>{
 const f=fixture();const original=f.file.arrayBuffer
 f.file.arrayBuffer=async()=>{const a=await original();f.auth.currentUser={uid:'owner'};return a}
 await assert.rejects(f.run(hash),x=>x.name==='AbortError')
 assert.equal(f.calls.some(x=>x.name==='registerMemoryMedia'),false)
})
