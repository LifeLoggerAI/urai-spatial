import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

const source = fs.readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, {
  fileName: 'useSelectedMemory.ts', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
})
assert.equal(transpiled.diagnostics.length, 0)

function harness(href='/focus?node=memory-one') {
  const slots = []
  let pos = 0, pending = [], dirty = false, currentHref = href, authCallback = null
  const subscriptions = []
  function depsChanged(a,b) { return !a || !b || a.length !== b.length || a.some((v,i)=>!Object.is(v,b[i])) }
  const react = {
    useState(initial) {
      const i=pos++
      if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial}
      return [slots[i].value, next=>{const v=typeof next==='function'?next(slots[i].value):next;slots[i].value=v;dirty=true}]
    },
    useMemo(factory,deps) {
      const i=pos++
      if(!slots[i] || depsChanged(slots[i].deps,deps))slots[i]={deps,value:factory()}
      return slots[i].value
    },
    useEffect(fn,deps) {
      const i=pos++,old=slots[i]
      if(!old || depsChanged(old.deps,deps)){
        slots[i]={deps,cleanup:old?.cleanup}
        pending.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn()})
      }
    },
  }
  const fsImport={doc:(_db,...path)=>path,onSnapshot(ref,receive,error){
    const item={ref,receive,error,stopped:false};subscriptions.push(item)
    return ()=>{item.stopped=true}
  }}
  const imports={
    react,'firebase/firestore':fsImport,
    'firebase/auth': {getAuth:()=>({}),onAuthStateChanged:(_auth,callback)=>{authCallback=callback;return ()=>{}}},
    '@/lib/firebase/client':{app:{},firebasePublicEnvReady:true,getFirebaseDb:()=>({})},
    '@/hooks/useBrowserLocation':{useBrowserLocation:()=>currentHref},
    '@/app/privacy-controls/consentModel':{isConsentPolicy:(p,owner)=>p?.ownerId===owner&&Number.isInteger(p.revision)},
    './explicitDemoMemory':{buildNamedExplicitDemoMemory:id=>({id,demo:true,replayManifest:{id:'demo-'+id}})},
    './selectedMemoryContract':{
      sanitizeMemoryId:id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,120}$/.test(id)?id:null,
      isExplicitDemoRequest:p=>p.get('demo')==='1'&&Boolean(p.get('memoryId')??p.get('node')),
      parseSelectedMemory:(data,owner,id)=>({status:'ready',memory:{...data,id,ownerId:owner,replayManifest:{id:'manifest-'+id}},message:'ready'}),
    },
  }
  const module={exports:{}}
  vm.runInNewContext(transpiled.outputText,{module,exports:module.exports,URLSearchParams,process:{env:{NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'test-bucket'}},require(name){assert.ok(name in imports,'unexpected '+name);return imports[name]}},{filename:'useSelectedMemory.ts'})
  function render(){for(let n=0;n<25;n++){
    dirty=false;pos=0;const result=module.exports.useSelectedMemory();const effects=pending;pending=[];effects.forEach(fn=>fn());if(!dirty)return result
  }throw Error('hook did not stabilize')}
  render()
  return {render,subscriptions,
    navigate(next){currentHref=next;return render()},
    authorize(owner='owner-1'){
      assert.ok(authCallback,'auth listener expected')
      authCallback({uid:owner});render()
      const policy=subscriptions.findLast(s=>s.ref.includes('privacyPolicy'))
      assert.ok(policy,'policy must subscribe')
      policy.receive({exists:()=>true,data:()=>({ownerId:owner,revision:1,
        domains:{memory:{mode:'granted',lifeMapVisible:true,replayVisible:true}},enforcement:{state:'fully-enforced'}})})
      return render()
    },
    supplyMemory(id){const sub=subscriptions.findLast(s=>s.ref.includes('memories'))
      assert.ok(sub);sub.receive({exists:()=>true,data:()=>({title:id})});return render()},
    privateSubs(){return subscriptions.filter(s=>s.ref.includes('memories'))},
  }
}

test('private Focus never treats a constellation node as a private memory ID',()=>{
  const h=harness('/focus?node=memory-one')
  assert.equal(h.render().status,'unavailable')
  assert.equal(h.subscriptions.length,0)
})
test('private Replay never treats a constellation node as a media-identity request',()=>{
  const h=harness('/replay?node=memory-one&manifestId=manifest-memory-one')
  assert.equal(h.render().status,'unavailable')
  assert.equal(h.subscriptions.length,0)
})
test('navigating away from a real memory to an event-only URL detaches the old memory',()=>{
  const h=harness('/focus?memoryId=memory-one&node=event-one')
  h.authorize();assert.equal(h.supplyMemory('memory-one').status,'ready')
  const old=h.privateSubs()[0]
  const result=h.navigate('/focus?node=memory-one')
  assert.equal(result.status,'unavailable')
  assert.equal(result.memory,null)
  assert.equal(old.stopped,true)
  assert.equal(h.privateSubs().length,1)
})
test('explicit demo node-only routes remain disclosed and require no private subscription',()=>{
  const h=harness('/focus?node=quiet-reset&demo=1')
  const r=h.render()
  assert.equal(r.status,'demo')
  assert.equal(r.memory.id,'demo:quiet-reset')
  assert.equal(h.subscriptions.length,0)
})
test('canonical private memory ID overrides unrelated constellation node and retains manifest',()=>{
  const h=harness('/replay?node=event-one&memoryId=memory-one&manifestId=manifest-memory-one')
  h.authorize()
  const sub=h.privateSubs()[0]
  assert.deepEqual([...sub.ref],['users','owner-1','memories','memory-one'])
  assert.equal(h.supplyMemory('memory-one').status,'ready')
})
test('invalid canonical memory ID cannot use a valid event ID as a substitute',()=>{
  const h=harness('/focus?node=memory-one&memoryId=invalid%2Fid')
  assert.equal(h.render().status,'unavailable')
  assert.equal(h.subscriptions.length,0)
})
