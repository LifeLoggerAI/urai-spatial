import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
import * as voice from '../src/spatial/adam/adamVoiceResponseBoundary.mjs'

const source = readFileSync(new URL('../src/spatial/adam/adamClient.ts', import.meta.url),'utf8')
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const deferred = () => {let resolve;return {promise:new Promise(r=>{resolve=r}),resolve:x=>resolve(x)}}
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setImmediate(r))}throw Error('request never reached expected phase')}
function harness(){
  const actor={uid:'owner-a',getIdToken:async()=> 'token-a'}
  const auth={currentUser:actor,authStateReady:async()=>{}}
  const pendingDigest={current:null}
  const stats={fetches:[],events:[],digestCalls:0}
  let digest=async()=>new Uint8Array(32).fill(4)
  let streamer=async(_response,{onEvent})=>{onEvent({type:'status',status:'ready',locale:'en-US'});return {locale:'en-US',message:'ok',caption:'ok',provider:'openai',requiresHumanFounder:false,handoffReason:'',suggestedActions:[]}}
  const exports={}
  const context={exports,require(name){
    if(name==='firebase/auth')return {getAuth:()=>auth}
    if(name==='@/lib/firebase/client')return {app:{},firebasePublicEnvReady:true}
    if(name==='@/lib/clientApiUrl')return {clientApiUrl:path=>path}
    if(name==='@/lib/i18n/contentLanguage')return {contentLanguage:()=>({speechTag:'en-US'})}
    if(name==='@/lib/i18n/presenceContentStream')return {readPresenceContentStream:(...args)=>streamer(...args)}
    if(name==='./adamVoiceResponseBoundary.mjs')return voice
    throw Error('Unexpected import: '+name)
  },fetch:async(url,opts)=>{stats.fetches.push({url,opts});return new Response('hello',{status:200,headers:{'content-type':'audio/mpeg'}})},
  globalThis:{crypto:{subtle:{digest:async(...args)=>{stats.digestCalls++;return digest(...args)}}}},
  TextEncoder,Uint8Array,Response,Blob,AbortController,Error}
  vm.runInNewContext(compiled,context,{filename:'adamClient.ts'})
  const input={message:'hello',context:[],surface:'home',locale:'en-US',aiProcessingConsent:true,signal:new AbortController().signal,onEvent:e=>stats.events.push(e)}
  return {auth,actor,exports,stats,input,setDigest:x=>{digest=x},setStreamer:x=>{streamer=x},setFetch:x=>{context.fetch=x},pendingDigest}
}
const code=expected=>e=>{assert.equal(e.code,expected);return true}

test('valid owner can request ADAM with stable identity',async()=>{
  const x=harness();const result=await x.exports.requestAdamPresence(x.input)
  assert.equal(result.message,'ok');assert.equal(x.stats.fetches.length,1);assert.equal(x.stats.digestCalls,1)
})
test('a same-UID User object rotation during ID token retrieval is denied',async()=>{
  const x=harness(),wait=deferred();x.actor.getIdToken=()=>wait.promise
  const work=x.exports.requestAdamPresence(x.input)
  await new Promise(r=>setImmediate(r));x.auth.currentUser={uid:'owner-a',getIdToken:async()=> 'new-token'}
  wait.resolve('old-token')
  await assert.rejects(work,code('AUTH_REQUIRED'))
  assert.equal(x.stats.fetches.length,0)
})
test('account switch during request-id hashing refuses stale context dispatch',async()=>{
  const x=harness(),wait=deferred();x.setDigest(()=>wait.promise)
  const work=x.exports.requestAdamPresence(x.input)
  await until(()=>x.stats.digestCalls===1)
  x.auth.currentUser={uid:'owner-b',getIdToken:async()=> 'token-b'}
  wait.resolve(new Uint8Array(32).fill(9))
  await assert.rejects(work,code('AUTH_SESSION_CHANGED'))
  assert.equal(x.stats.fetches.length,0)
})
test('same-UID session replacement during hashing is also denied',async()=>{
  const x=harness(),wait=deferred();x.setDigest(()=>wait.promise)
  const work=x.exports.requestAdamPresence(x.input)
  await until(()=>x.stats.digestCalls===1)
  x.auth.currentUser={uid:'owner-a',getIdToken:async()=> 'new-token'}
  wait.resolve(new Uint8Array(32).fill(9))
  await assert.rejects(work,code('AUTH_SESSION_CHANGED'))
  assert.equal(x.stats.fetches.length,0)
})
test('ADAM stream callback after sign-out cannot publish stale owner content',async()=>{
  const x=harness();x.setStreamer(async(_res,{onEvent})=>{
    x.auth.currentUser=null
    onEvent({type:'delta',text:'stale owner output',locale:'en-US'})
  })
  await assert.rejects(x.exports.requestAdamPresence(x.input),code('AUTH_SESSION_CHANGED'))
  assert.deepEqual(x.stats.events,[])
})
test('Founder voice does not produce a Blob after owner changes while receiving bytes',async()=>{
  const x=harness();let sent=false
  x.setFetch(async()=>new Response(new ReadableStream({pull(ctrl){
    if(!sent){ctrl.enqueue(new Uint8Array(30).fill(66));sent=true;x.auth.currentUser=null}
    else ctrl.close()
  }}),{headers:{'content-type':'audio/mpeg'}}))
  const r=await x.exports.requestAdamFounderVoice({text:'hello',locale:'en-US',externalProcessingConsent:true,signal:x.input.signal})
  assert.equal(r.blob,null);assert.equal(r.errorCode,'ADAM_VOICE_SESSION_CHANGED')
})
test('Founder voice refuses a non-audio 200 response',async()=>{
  const x=harness();x.setFetch(async()=>new Response('<html>oops</html>',{headers:{'content-type':'text/html'}}))
  const r=await x.exports.requestAdamFounderVoice({text:'hello',locale:'en-US',externalProcessingConsent:true,signal:x.input.signal})
  assert.equal(r.blob,null);assert.equal(r.errorCode,'ADAM_VOICE_MIME_INVALID')
})
test('Founder voice keeps existing per-turn playback evidence unavailable',async()=>{
  const x=harness();x.setFetch(async()=>new Response(new Uint8Array(20),{headers:{'content-type':'audio/mpeg','content-length':'20'}}))
  const r=await x.exports.requestAdamFounderVoice({text:'hello',locale:'en-US',externalProcessingConsent:true,signal:x.input.signal})
  assert.equal(r.blob?.size,20);assert.equal(r.errorCode,null);assert.equal(r.playbackEvidence,undefined)
})
