import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript')
const source=fs.readFileSync(new URL('../src/spatial/life-model/personPresenceClient.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:x=>resolve(x)}}
const wait=ms=>new Promise(r=>setTimeout(r,ms))
function fixture(fetchImpl=async()=>new Response('mock')){
 const actor={uid:'a',getIdToken:async()=> 'old'}
 const auth={currentUser:actor,authStateReady:async()=>{}},calls=[],events=[],out={},streams=[]
 let digest=async()=>new Uint8Array(32).fill(1),streamer=async(_r,o)=>{streams.push(o);o.onEvent({type:'status',status:'ready',locale:'en-US'});return {message:'ok',caption:'ok',locale:'en-US'}}
 vm.runInNewContext(compiled,{exports:out,require:n=>{
 if(n==='firebase/auth')return {getAuth:()=>auth}
 if(n==='@/lib/firebase/client')return {app:{},firebasePublicEnvReady:true}
 if(n==='@/lib/clientApiUrl')return {clientApiUrl:x=>x}
 if(n==='@/lib/i18n/contentLanguage')return {contentLanguage:x=>x==='en-US'?{speechTag:'en-US'}:null}
 if(n==='@/lib/i18n/presenceContentStream')return {readPresenceContentStream:(...a)=>streamer(...a)}
 throw Error('unknown '+n)
 },globalThis:{crypto:{subtle:{digest:(...a)=>digest(...a)}}},fetch:async(...a)=>{calls.push(a);return fetchImpl(...a)},TextEncoder,TextDecoder,Uint8Array,Response,AbortController,Error,setInterval,clearInterval},{filename:'personPresenceClient.ts'})
 const ac=new AbortController()
 return {auth,actor,ac,calls,events,streams,request:out.requestPersonPresence,setDigest:f=>digest=f,setStreamer:f=>streamer=f,input:{sessionId:'s',message:'hello',context:[],locale:'en-US',aiProcessingConsent:true,signal:ac.signal,onEvent:x=>events.push(x)}}
}
const stale=e=>e?.code==='AUTH_SESSION_CHANGED'||e?.code==='AUTH_REQUIRED'
test('Person conversation refuses rotated Firebase User while token is pending',async()=>{
 const x=fixture(),d=gate();x.actor.getIdToken=()=>d.promise;const task=x.request(x.input)
 await wait(10);x.auth.currentUser={uid:'a',getIdToken:async()=> 'new'};d.resolve('old')
 await assert.rejects(task,stale);assert.equal(x.calls.length,0)
})
test('Person conversation refuses changed owner during asynchronous request-id hash',async()=>{
 const x=fixture(),d=gate();x.setDigest(()=>d.promise);const task=x.request(x.input)
 await wait(15);x.auth.currentUser={uid:'b'};d.resolve(new Uint8Array(32).fill(1))
 await assert.rejects(task,stale);assert.equal(x.calls.length,0)
})
test('Person conversation forwards no stale stream callbacks',async()=>{
 const x=fixture();x.setStreamer(async(_r,o)=>{x.auth.currentUser=null;o.onEvent({type:'delta',text:'private',locale:'en-US'})})
 await assert.rejects(x.request(x.input),stale);assert.equal(x.events.length,0)
})
test('Person conversation preserves authorized completion and current owner predicate',async()=>{
 const x=fixture(),r=await x.request(x.input)
 assert.equal(r.message,'ok');assert.equal(x.calls.length,1);assert.equal(x.events.length,1);assert.equal(x.streams[0].isCurrent(),true)
})


test('Person Presence retains a safe error code without forwarding private provider message text',async()=>{
 const x=fixture(async()=>new Response(JSON.stringify({error:'CONSENT_REQUIRED',message:'PRIVATE_DOCUMENT_CONTENT'}),{status:403,headers:{'content-type':'application/json'}}))
 await assert.rejects(x.request(x.input),e=>{
  assert.equal(e.code,'CONSENT_REQUIRED')
  assert.doesNotMatch(e.message,/PRIVATE_DOCUMENT_CONTENT/)
  return true
 })
})

test('Person Presence bounds HTTP error body and cancels unread bytes',async()=>{
 let canceled=false
 const x=fixture(async()=>new Response(new ReadableStream({
  start(c){c.enqueue(new Uint8Array(100000))},pull(){},cancel(){canceled=true},
 },{highWaterMark:0}),{status:502,headers:{'content-type':'application/json'}}))
 const task=x.request(x.input)
 const code=await Promise.race([task.then(()=> 'ACCEPTED',e=>e.code),wait(350).then(()=> 'STALLED')])
 x.ac.abort()
 assert.equal(code,'PERSON_PRESENCE_FAILURE')
 assert.equal(canceled,true)
})

test('Person Presence stops stalled HTTP error response when Firebase owner rotates',async()=>{
 let canceled=false,controller
 const x=fixture(async()=>new Response(new ReadableStream({
  start(c){controller=c;c.enqueue(Uint8Array.of(123))},pull(){},cancel(){canceled=true},
 },{highWaterMark:0}),{status:403,headers:{'content-type':'application/json'}}))
 const task=x.request(x.input)
 await wait(30)
 x.auth.currentUser=null
 const code=await Promise.race([task.then(()=> 'ACCEPTED',e=>e.code),wait(350).then(()=> 'STALLED')])
 try{controller.close()}catch{}
 x.ac.abort()
 await task.catch(()=>{})
 assert.equal(code,'AUTH_SESSION_CHANGED')
 assert.equal(canceled,true)
})
