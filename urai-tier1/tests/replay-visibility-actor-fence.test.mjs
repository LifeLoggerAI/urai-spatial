import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
const source = readFileSync(new URL('../src/spatial/memory/useReplayMemoryVisibility.ts', import.meta.url),'utf8')
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
function harness(){
 const states=[];let index=0,effect,callback;const observers=new Map(),auth={currentUser:null}
 const react={useState(init){const i=index++;if(!(i in states))states[i]=init;return [states[i],v=>{states[i]=v}]},useEffect(f){effect=f}}
 const module={exports:{}}
 vm.runInNewContext(compiled,{module,exports:module.exports,navigator:{onLine:true},window:{addEventListener(){},removeEventListener(){}},require(id){
  if(id==='react')return react
  if(id==='firebase/auth')return {getAuth:()=>auth,onAuthStateChanged(_a,f){callback=f;return ()=>{}}}
  if(id==='firebase/firestore')return {doc:(_db,...x)=>x.join('/'),onSnapshot(path,f){observers.set(path,f);return ()=>observers.delete(path)}}
  if(id==='@/lib/firebase/client')return {app:{},firebasePublicEnvReady:true,getFirebaseDb:()=>({})}
  throw Error('Unexpected module '+id)
 }})
 return {auth,render(m){index=0;return module.exports.useReplayMemoryVisibility(m)},commit(){effect()},login(u){auth.currentUser=u;callback(u)},authorize(u,id){
 const docs=[
 ['users/'+u.uid+'/memories/'+id,{ownerId:u.uid,privacy:'private',consentState:'authorized'}],
 ['users/'+u.uid+'/privacyPolicy/current',{ownerId:u.uid,version:2,revision:1,enforcement:{state:'fully-enforced'},domains:{memory:{mode:'granted',replayVisible:true}}}],
 ['users/'+u.uid,{accountStatus:'active'}],
 ['users/'+u.uid+'/privacyRuntime/exportAuthority',{generation:0,pendingDeletions:{}}]
 ]
 for(const [path,data] of docs){const f=observers.get(path);assert.equal(typeof f,'function');f({exists:()=>true,data:()=>data})}
 },revoke(u,id){observers.get('users/'+u.uid+'/memories/'+id)({exists:()=>true,data:()=>({ownerId:u.uid,consentState:'revoked'})})}}
}
const memory={ownerId:'owner-a',id:'memory-a',privacy:'private',demo:false}
function ready(){const h=harness(),actor={uid:'owner-a'};assert.equal(h.render(memory),'loading');h.commit();h.login(actor);h.authorize(actor,memory.id);assert.equal(h.render(memory),'visible');return {h,actor}}
test('account switch fails closed before observer dispatch',()=>{const {h}=ready();h.auth.currentUser={uid:'owner-b'};assert.notEqual(h.render(memory),'visible')})
test('sign-out fails closed before observer dispatch',()=>{const {h}=ready();h.auth.currentUser=null;assert.notEqual(h.render(memory),'visible')})
test('consent revocation fails closed',()=>{const {h,actor}=ready();h.revoke(actor,memory.id);assert.equal(h.render(memory),'unavailable')})
test('different selected memory never inherits prior visibility',()=>{const {h}=ready();assert.equal(h.render({...memory,id:'memory-b'}),'loading')})
