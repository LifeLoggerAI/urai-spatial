import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
// Execute the exact original ADAM token function with a controlled Firebase
// Auth object; no actual credentials, accounts or paid providers are used.
const s=readFileSync(new URL('../src/spatial/adam/adamClient.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n')
const b=s.indexOf('async function bearerToken() {')
const e=s.indexOf('\n}\n\nexport async function requestAdamPresence',b)
assert.ok(b>=0&&e>b)
class AdamProviderError extends Error{constructor(code,message){super(message);this.code=code}}
function bearer(auth,ready=true,access=()=>{}){
 return vm.runInNewContext(s.slice(b,e+2)+'\nbearerToken',{
  firebasePublicEnvReady:ready,app:{},
  getAuth:()=>{access();return auth},AdamProviderError
 })
}
function pending(){let resolve;return {promise:new Promise(yes=>{resolve=yes}),resolve:(v)=>resolve(v)}}
function denied(code){return err=>{assert.equal(err.code,code);return true}}
test('restores persisted account before using currentUser',async()=>{
 const p=pending(),auth={currentUser:null,authStateReady:()=>p.promise}
 const promise=bearer(auth)();let calls=0
 await Promise.resolve()
 auth.currentUser={uid:'a',getIdToken:async()=>{calls++;return 'token-a'}}
 assert.equal(calls,0);p.resolve();assert.equal(await promise,'token-a');assert.equal(calls,1)
})
test('signed out fails closed',async()=>{
 await assert.rejects(bearer({currentUser:null,authStateReady:async()=>{}})(),denied('AUTH_REQUIRED'))
})
for(const nextUser of [{uid:'b'},null]){
 test('account switch/sign-out during token retrieval rejects old token '+String(nextUser?.uid??'signed-out'),async()=>{
  const p=pending(),auth={currentUser:{uid:'a',getIdToken:()=>p.promise},authStateReady:async()=>{}}
  const result=bearer(auth)();await new Promise(r=>setImmediate(r));auth.currentUser=nextUser
  p.resolve('stale-token-a');await assert.rejects(result,denied('AUTH_REQUIRED'))
 })
}
test('blank token fails closed',async()=>{
 await assert.rejects(bearer({currentUser:{uid:'a',getIdToken:async()=>''},authStateReady:async()=>{}})(),denied('AUTH_REQUIRED'))
})
test('unconfigured Firebase fails before SDK access',async()=>{
 let access=0;await assert.rejects(bearer(null,false,()=>{access++})(),denied('FIREBASE_NOT_READY'));assert.equal(access,0)
})
test('initialization error does not read stale token',async()=>{
 let calls=0;const auth={currentUser:{uid:'a',getIdToken:async()=>{calls++;return 'token'}},authStateReady:async()=>{throw Error('unavailable')}}
 await assert.rejects(bearer(auth)(),/unavailable/);assert.equal(calls,0)
})
test('stable account obtains a token exactly once',async()=>{
 let calls=0;const auth={currentUser:{uid:'a',getIdToken:async()=>{calls++;return 'token-a'}},authStateReady:async()=>{}}
 assert.equal(await bearer(auth)(),'token-a');assert.equal(calls,1)
})
