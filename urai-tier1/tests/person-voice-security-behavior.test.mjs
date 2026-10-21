import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const ts=require('typescript')
import * as boundary from '../src/spatial/adam/adamVoiceResponseBoundary.mjs'
const source=fs.readFileSync(new URL('../src/spatial/life-model/personPresenceVoiceClient.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:x=>resolve(x)}}
function fixture(config={}){
 const user={uid:'owner',getIdToken:config.token|| (async()=> 'token')}
 const auth={currentUser:user,authStateReady:async()=>{}},calls=[],out={}
 vm.runInNewContext(compiled,{exports:out,require:n=>{
 if(n==='firebase/auth')return {getAuth:()=>auth}
 if(n==='@/lib/firebase/client')return {app:{},firebasePublicEnvReady:true}
 if(n==='@/lib/clientApiUrl')return {clientApiUrl:x=>x}
 if(n==='@/lib/i18n/contentLanguage')return {contentLanguage:x=>x==='en-US'?{speechTag:'en-US'}:null}
 if(n==='../adam/adamVoiceResponseBoundary.mjs')return boundary
 throw Error('unknown dependency '+n)
 },fetch:async(...args)=>{calls.push(args);return config.fetch?config.fetch(...args):new Response(Uint8Array.of(1,2),{headers:{'content-type':'audio/mpeg'}})},Response,Blob,Uint8Array,AbortController,TextDecoder,setInterval,clearInterval},{filename:'personPresenceVoiceClient.ts'})
 const ac=new AbortController()
 return {request:out.requestPersonPresenceVoice,requestPersonPresenceVoice:out.requestPersonPresenceVoice,auth,user,calls,ac,input:{sessionId:'synthetic',text:'test',locale:'en-US',externalProcessingConsent:true,signal:ac.signal}}
}
test('Person voice denies same-UID actor replacement before dispatch',async()=>{
 const gate=deferred(),f=fixture({token:()=>gate.promise}),work=f.request(f.input)
 await sleep(15);f.auth.currentUser={uid:'owner',getIdToken:async()=> 'new'};gate.resolve('old')
 const result=await work
 assert.equal(result.blob,null);assert.equal(result.errorCode,'AUTH_SESSION_CHANGED');assert.equal(f.calls.length,0)
})
test('Person voice rejects oversized declared audio',async()=>{
 const f=fixture({fetch:async()=>new Response(Uint8Array.of(1),{headers:{'content-type':'audio/mpeg','content-length':String(8*1024*1024+1)}})})
 const v=await f.request(f.input);assert.equal(v.blob,null);assert.ok(v.errorCode)
})
test('Person voice cancels stalled private audio on owner loss without abort',async()=>{
 let canceled=false,ctrl
 const body=new ReadableStream({start(c){ctrl=c;c.enqueue(Uint8Array.of(1))},pull(){},cancel(){canceled=true}},{highWaterMark:0})
 const f=fixture({fetch:async()=>new Response(body,{headers:{'content-type':'audio/mpeg'}})})
 const task=f.request(f.input);await sleep(20);f.auth.currentUser=null
 const v=await Promise.race([task,sleep(250).then(()=>({errorCode:'STALLED'}))])
 if(v.errorCode==='STALLED'){ctrl.close();await task.catch(()=>{})}
 assert.equal(v.errorCode,'AUTH_SESSION_CHANGED');assert.equal(v.blob,null);assert.equal(canceled,true)
})
test('Person voice allows correctly bounded current-owner audio',async()=>{
 const f=fixture(),v=await f.request(f.input);assert.equal(v.errorCode,null);assert.deepEqual([...new Uint8Array(await v.blob.arrayBuffer())],[1,2])
})


test('bounded server voice denial retains its safe machine-readable code', async () => {
  const x = fixture({fetch: async () => new Response(JSON.stringify({error:'PROVIDER_PROCESSING_REVOKED'}),{status:403,headers:{'content-type':'application/json'}})})
  const v = await x.requestPersonPresenceVoice(x.input)
  assert.equal(v.blob,null)
  assert.equal(v.errorCode,'PROVIDER_PROCESSING_REVOKED')
})

test('oversized error response is bounded and returns generic failure', async () => {
  let cancelled = false
  const x = fixture({fetch: async () => new Response(new ReadableStream({
    start(c) { c.enqueue(new Uint8Array(20000)); }, async pull(c) { await sleep(160); c.close() }, cancel() { cancelled=true },
  }),{status:502,headers:{'content-type':'application/json'}})})
  const v=await x.requestPersonPresenceVoice(x.input)
  assert.equal(v.blob,null)
  assert.equal(v.errorCode,'PERSON_VOICE_UNAVAILABLE')
  assert.equal(cancelled,true)
})

test('stalled error response settles when exact owner changes without network abort', async () => {
  let cancelled=false,streamControl
  const response=new Response(new ReadableStream({
    start(c) { streamControl=c;c.enqueue(Uint8Array.of(123)) },
    pull() {},cancel(){cancelled=true},
  },{highWaterMark:0}),{status:403,headers:{'content-type':'application/json'}})
  const x=fixture({fetch:async()=>response})
  const work=x.requestPersonPresenceVoice(x.input)
  await sleep(20);x.auth.currentUser=null
  const outcome=await Promise.race([work,sleep(250).then(()=>({errorCode:'STALLED'}))])
  if(outcome.errorCode==='STALLED'){try{streamControl.close()}catch{};await work.catch(()=>{})}
  assert.equal(outcome.errorCode,'AUTH_SESSION_CHANGED')
  assert.equal(cancelled,true)
})

test('stalled voice error cancels immediately on explicit request abort', async () => {
  let canceled = false
  const response = new Response(new ReadableStream({
    pull() {}, cancel() { canceled = true },
  }, { highWaterMark: 0 }), { status: 403 })
  const x = fixture({ fetch: async () => response })
  const pending = x.request(x.input)
  await sleep(20)
  x.ac.abort()
  const outcome = await Promise.race([pending, sleep(400).then(() => ({ errorCode: 'STALLED' }))])
  assert.equal(outcome.errorCode, 'AUTH_SESSION_CHANGED')
  assert.equal(outcome.blob, null)
  assert.equal(canceled, true)
})

test('stalled voice error cancels on same-UID Firebase actor replacement', async () => {
  let canceled = false
  const response = new Response(new ReadableStream({
    pull() {}, cancel() { canceled = true },
  }, { highWaterMark: 0 }), { status: 403 })
  const x = fixture({ fetch: async () => response })
  const pending = x.request(x.input)
  await sleep(20)
  x.auth.currentUser = { uid: 'owner', getIdToken: async () => 'new-token' }
  const outcome = await Promise.race([pending, sleep(400).then(() => ({ errorCode: 'STALLED' }))])
  assert.equal(outcome.errorCode, 'AUTH_SESSION_CHANGED')
  assert.equal(outcome.blob, null)
  assert.equal(canceled, true)
})
