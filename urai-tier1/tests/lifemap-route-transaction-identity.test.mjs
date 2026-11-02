import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/spatial/world/LifeMapRouteTransactionBridge.tsx', import.meta.url), 'utf8')
const js = ts.transpileModule(source,{ fileName:'LifeMapRouteTransactionBridge.tsx', reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
assert.equal(js.diagnostics?.length,0)
const nodes=[
  {id:'event-m42',memoryId:'memory-m42',authorizedMemory:true,replayManifestId:'manifest-m42',title:'Recorded Place',summary:'Verifiable source',eraId:'family'},
  {id:'event-context',authorizedMemory:false,title:'Context Signal',summary:'No canonical memory'},
]
function identity(current,next,selectedMemoryId){
 const oldId=current.get('memoryId')??current.get('node')
 if(current.get('demo')==='1') {next.set('demo','1');next.set('manifestId','demo-manifest-'+(selectedMemoryId??oldId))}
 else if(current.get('manifestId') && (!selectedMemoryId||selectedMemoryId===oldId))next.set('manifestId',current.get('manifestId'))
 for(const flag of ['onboarding','firstRun'])if(current.get(flag)==='1')next.set(flag,'1')
 return next
}
function fixture(search){
 const host='https://urai.app'
 const location=new URL('/life-map'+search,host)
 const callbacks={}; const calls=[]
 class FakeElement{
  constructor(role,text){this.role=role;this.textContent=text}
  closest(selector){if(selector==='button')return this
   if(selector==='details.life-map-help')return this.role==='help'?{}:null
   if(selector==='nav[aria-label="Selected memory actions"]')return this.role==='overview'?{}:null
   return null}
 }
 const window={location,history:{state:null,
    replaceState(_state,_title,href){calls.push({type:'replace',href});const u=new URL(href,host);location.pathname=u.pathname;location.search=u.search},
    pushState(_state,_title,href){calls.push({type:'push',href});const u=new URL(href,host);location.pathname=u.pathname;location.search=u.search},
  },addEventListener(name,fn){callbacks[name]=fn},removeEventListener(name){delete callbacks[name]}}
 const imports={
  react:{useState(initial){return [initial,()=>{}]},useEffect(effect){effect()}},
  'firebase/auth':{getAuth:()=>({}),onAuthStateChanged:()=>()=>{}},
  '@/hooks/useBrowserLocation':{useBrowserLocation:()=>location.pathname+location.search},
  '@/components/lifemap/useLifeMapEvents':{useLifeMapEvents:()=>({nodes})},
  '@/lib/firebase/client':{app:{},firebasePublicEnvReady:true},
  '@/spatial/memory/lifeMapSelectionJourney':{withLifeMapSelectionIdentity:identity},
 }
 const module={exports:{}}
 vm.runInNewContext(js.outputText,{module,exports:module.exports,URL,URLSearchParams,Element:FakeElement,window,require(name){assert.ok(name in imports,'unrecognized import '+name);return imports[name]}}, {filename:'LifeMapRouteTransactionBridge.tsx'})
 module.exports.LifeMapRouteTransactionBridge()
 assert.equal(typeof callbacks.click,'function')
 return{calls,location,activate(role,text){callbacks.click({target:new FakeElement(role,text)})}}
}
test('canonical private memory ID survives actual Help selection event',()=>{
 const f=fixture('?node=old-event&memoryId=old-memory&manifestId=old-manifest')
 f.activate('help','Recorded Place: Verifiable source')
 assert.equal(f.location.searchParams.get('node'),'event-m42')
 assert.equal(f.location.searchParams.get('memoryId'),'memory-m42')
 assert.equal(f.location.searchParams.get('manifestId'),'manifest-m42')
 assert.equal(f.calls.at(-1).type,'replace')
})
test('contextual Life Map event never fabricates a private memory request',()=>{
 const f=fixture('?node=old-event&memoryId=old-memory&manifestId=old-manifest')
 f.activate('help','Context Signal: No canonical memory')
 assert.equal(f.location.searchParams.get('node'),'event-context')
 assert.equal(f.location.searchParams.get('memoryId'),null)
 assert.equal(f.location.searchParams.get('manifestId'),null)
})
test('overview retains separate event and memory identity without rewriting either',()=>{
 const f=fixture('?node=event-m42&memoryId=memory-m42&manifestId=manifest-m42')
 f.activate('overview','Overview')
 assert.equal(f.location.searchParams.get('node'),'event-m42')
 assert.equal(f.location.searchParams.get('memoryId'),'memory-m42')
 assert.equal(f.location.searchParams.get('manifestId'),'manifest-m42')
 assert.equal(f.location.searchParams.get('overview'),'1')
 assert.equal(f.calls.at(-1).type,'push')
})
test('overview cannot promote context-only event into private memory identity',()=>{
 const f=fixture('?node=event-context')
 f.activate('overview','Overview')
 assert.equal(f.location.searchParams.get('node'),'event-context')
 assert.equal(f.location.searchParams.get('memoryId'),null)
 assert.equal(f.location.searchParams.get('overview'),'1')
})
test('disclosed demo Help selection renews demo manifest rather than inheriting prior star',()=>{
 const f=fixture('?demo=1&node=old-demo&memoryId=old-demo&manifestId=old-manifest')
 f.activate('help','Recorded Place: Verifiable source')
 assert.equal(f.location.searchParams.get('demo'),'1')
 assert.equal(f.location.searchParams.get('node'),'event-m42')
 assert.equal(f.location.searchParams.get('memoryId'),'event-m42')
 assert.equal(f.location.searchParams.get('manifestId'),'demo-manifest-event-m42')
})
