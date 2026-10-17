import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), ts = require('typescript')
const source = fs.readFileSync('src/app/settings/DeviceSettingsClient.tsx', 'utf8')
const code = ts.transpileModule(source + '\nexport { googleRequest }', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return {promise,resolve,reject} }
const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve() }
function fixture() {
  const values=[], effects=[], refs=[], requests=[], writes=[]; let index=0, refIndex=0, callback, authError, unsubscribed=false
  const auth={currentUser:null}, exports={}
  const owner = id => ({uid:id,getIdToken:async()=>`token-${id}`})
  const react={useState(initial){const key=index++; if(!(key in values))values[key]=initial; return [values[key],v=>{values[key]=v; writes.push(key)}]}, useRef(initial){const key=refIndex++; return refs[key]??=( {current:initial} )},useEffect(fn){effects.push(fn)}}
  const jsx=(_type,props)=>({type:_type,props})
  const imports={react,'react/jsx-runtime':{jsx,jsxs:jsx},'firebase/auth':{getAuth:()=>auth,onAuthStateChanged(_auth,next,error){callback=next;authError=error;return()=>{unsubscribed=true}}},'@/lib/firebase/client':{app:{},firebasePublicEnvReady:true},'@/lib/clientApiUrl':{clientApiUrl:path=>path},'@/lib/i18n/useUraiLocale':{useUraiLocale:()=>({props:()=>({}),text:x=>x})}}
  const env={exports,require:name=>imports[name]??{},AbortController,DOMException,URLSearchParams,window:{location:{search:'',assign:()=>{}},localStorage:{getItem:()=>null}},fetch:async(url,options)=>{const result=deferred();requests.push({url,options,result});return result.promise}}
  vm.runInNewContext(code,env)
  const render=()=>{index=refIndex=0;effects.length=0;return exports.default()}
  render(); const cleanup=effects[1]()
  const switchOwner=user=>{auth.currentUser=user;callback(user)}
  const deliver=(i,connected)=>requests[i].result.resolve({ok:true,json:async()=>({connected,scopes:[],status:'connected',expiresAt:null})})
  return {render,exports,env,values,requests,writes,owner,switchOwner,deliver,cleanup,authError:()=>authError(),unsubscribed:()=>unsubscribed}
}
test('account switch clears connected status immediately and ignores late previous-owner status',async()=>{
 const f=fixture();f.switchOwner(f.owner('a'));await flush();f.deliver(0,true);await flush();assert.equal(f.values[6].connected,true)
 f.switchOwner(f.owner('b'));assert.equal(f.values[6],null);assert.equal(f.requests[0].options.signal.aborted,true);await flush()
 f.switchOwner(null);f.deliver(1,true);await flush();assert.equal(f.values[6],null);assert.equal(f.values[5],'signed-out')
})
test('pending old-owner token cannot dispatch a Workspace request',async()=>{
 const f=fixture(),token=deferred(),a=f.owner('a');a.getIdToken=()=>token.promise
 f.switchOwner(a);f.switchOwner(null);token.resolve('old-token');await flush();assert.equal(f.requests.length,0);assert.equal(f.values[5],'signed-out')
})
test('unmount aborts request and blocks late success, failure and auth callbacks',async()=>{
 for(const outcome of ['success','failure']){
 const f=fixture();f.switchOwner(f.owner('a'));await flush();f.cleanup();const count=f.writes.length
 assert.equal(f.requests[0].options.signal.aborted,true);assert.equal(f.unsubscribed(),true)
 if(outcome==='success')f.deliver(0,true);else f.requests[0].result.reject(new Error('offline'))
 f.switchOwner(f.owner('b'));await flush();assert.equal(f.writes.length,count)
 }
})
test('auth read error removes account and connection authority',async()=>{
 const f=fixture();f.switchOwner(f.owner('a'));await flush();f.deliver(0,true);await flush();f.authError();assert.equal(f.values[4],null);assert.equal(f.values[6],null);assert.equal(f.values[5],'error')
})
test('transport fences authority while response JSON is pending and omits ambient credentials',async()=>{
 const f=fixture(),json=deferred(),controller=new AbortController();let active=true,observed
 f.env.fetch=async(url,options)=>{observed=options;return{ok:true,json:()=>json.promise}}
 const pending=f.exports.googleRequest('/api/google/oauth/disconnect',f.owner('a'),{signal:controller.signal,isCurrent:()=>active})
 await flush();active=false;json.resolve({connected:false});await assert.rejects(pending,error=>error.name==='AbortError')
 assert.equal(observed.credentials,'omit');assert.equal(observed.redirect,'error');assert.equal(observed.referrerPolicy,'no-referrer')
})

function findButton(tree, label) {
 if(!tree || typeof tree !== 'object') return null
 if(tree.type === 'button' && tree.props.children === label) return tree
 for(const item of [tree.props?.children].flat(Infinity)) { const found=findButton(item,label); if(found)return found }
 return null
}
test('late old-owner connect cannot navigate after account switch', async()=>{
 const f=fixture();let navigations=0;f.env.window.location.assign=()=>navigations++
 f.switchOwner(f.owner('a'));await flush();f.deliver(0,false);await flush()
 const button=findButton(f.render(),'Connect Google');assert.ok(button);button.props.onClick();await flush()
 assert.equal(f.requests[1].url,'/api/google/oauth/start');f.switchOwner(f.owner('b'))
 f.requests[1].result.resolve({ok:true,json:async()=>({authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth'})});await flush()
 assert.equal(navigations,0);assert.equal(f.values[5],'checking');assert.equal(f.values[6],null)
})
test('late old-owner disconnect cannot overwrite next-account status', async()=>{
 const f=fixture();f.switchOwner(f.owner('a'));await flush();f.deliver(0,true);await flush()
 const button=findButton(f.render(),'Disconnect');assert.ok(button);button.props.onClick();await flush()
 assert.equal(f.requests[1].url,'/api/google/oauth/disconnect');f.switchOwner(f.owner('b'));await flush();f.deliver(2,true);await flush()
 f.deliver(1,false);await flush();assert.equal(f.values[6].connected,true);assert.equal(f.values[5],'ready')
})
