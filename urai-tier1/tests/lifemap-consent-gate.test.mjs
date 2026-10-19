import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(process.env.URAI_LIFEMAP_SOURCE ?? new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { fileName: 'useLifeMapEvents.ts', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
assert.equal(compiled.diagnostics.length, 0, 'original Life Map TypeScript must transpile without syntax errors')

function harness(initialUser = 'owner-a') {
  const subscriptions = []
  const state = []
  let index = 0, dirty = false, pending = [], currentUser = initialUser
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
  const react = {
    useState(initial) {
      const i = index++
      if (!(i in state)) state[i] = { value: typeof initial === 'function' ? initial() : initial }
      return [state[i].value, next => {
        const value = typeof next === 'function' ? next(state[i].value) : next
        if (!Object.is(value, state[i].value)) { state[i].value = value; dirty = true }
      }]
    },
    useMemo(fn, deps) {
      const i = index++
      if (!state[i] || !same(state[i].deps, deps)) state[i] = {value: fn(), deps}
      return state[i].value
    },
    useEffect(fn, deps) {
      const i = index++, old = state[i]
      if (!old || !same(old.deps, deps)) {
        state[i] = {deps, cleanup:old?.cleanup}
        pending.push(() => {
          state[i].cleanup?.()
          state[i].cleanup = fn()
        })
      }
    },
  }
  const doc = (_db, ...paths) => ({kind:'document', paths})
  const collection = (_db, ...paths) => ({kind:'collection', paths})
  const onSnapshot = (ref, success, error) => {
    const s = {ref,success,error,stopped:false,emit(data) {
      if (ref.kind === 'document') success({exists:()=>data !== null, data:()=>data})
      else success({docs:data.map(({id,value})=>({id,data:()=>value}))})
    },fail(){error(new Error('raw-provider-private-details'))}}
    subscriptions.push(s)
    return () => {s.stopped = true}
  }
  const demoNodes = [{id:'disclosed-demo-star',title:'Demo Only',type:'memory',position:[0,0,0]}]
  const imports = {
    react,
    'firebase/firestore': {collection,doc,query:(ref)=>ref,limit:()=>null,orderBy:()=>null,onSnapshot},
    '@/spatial/memory/selectedMemoryContract': {
      sanitizeMemoryId:id=>id && /^[a-z0-9-]+$/.test(id)?id:null,
      parseSelectedMemory:(raw,owner,id)=>raw.deleted || raw.consentState==='revoked' || raw.ownerId !== owner
        ? {status:'unauthorized',memory:null} : {status:'ready',memory:{id,ownerId:owner,title:raw.title,summary:raw.summary,replayManifest:{id:raw.manifest}}},
    },
    '@/app/privacy-controls/consentModel': { isConsentPolicy: (raw,owner) => Boolean(raw && raw.version===2 && raw.ownerId===owner
      && Number.isSafeInteger(raw.revision) && raw.revision>=0 && raw.domains?.memory
      && ['granted','limited','paused','denied'].includes(raw.domains.memory.mode)
      && typeof raw.domains.memory.lifeMapVisible==='boolean' && raw.enforcement?.state) },
    '../../lib/firebase/client':{firebasePublicEnvReady:true,getFirebaseDb:()=>({})},
    './canonicalLifeMapDemoNodes':{canonicalLifeMapDemoNodes:demoNodes},
    './lifeMapLayout':{lifeMapDisplayPosition:()=>[0,0,0]},
    './lifeMapData':{lifeMapEras:[{id:'demo-era',title:'Demo Era'}],mapLifeMapEventToNode:e=>({
      id:e.id,title:e.title,summary:e.summary,subtitle:e.subtitle||'',type:e.type,
      position:e.position||[0,0,0],dateLabel:e.dateLabel||'sensitive-date',
      intensity:.5,aura:'#aaddff',sourceType:e.sourceType,
      sourceId:e.sourceId,tags:e.tags,narratorHint:e.narratorHint,
      clusterId:e.clusterId,eraId:e.eraId,connectedTo:e.connectedTo||[],
      memoryId:e.memoryId,replayAvailable:e.replayAvailable,locked:e.locked||false,
    })},
  }
  const module = {exports:{}}
  vm.runInNewContext(compiled.outputText, {module,exports:module.exports,process:{env:{NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'test-bucket'}},
    require(name) {assert.ok(name in imports, 'Unexpected original dependency: '+name);return imports[name]},
  }, {filename:'useLifeMapEvents.original.ts'})
  const hook = module.exports.useLifeMapEvents
  function render() {
    for(let step=0; step<35; step++) {
      dirty=false;index=0
      const result=hook(currentUser)
      const flush=pending; pending=[];flush.forEach(fn=>fn())
      if(!dirty) return result
    }
    throw Error('hook did not settle after 35 updates')
  }
  const policy = (revision=1, mode='granted', visible=true) => ({version:2,ownerId:currentUser,revision,domains:{memory:{mode,lifeMapVisible:visible}},enforcement:{state:'fully-enforced'}})
  const find=(name)=>subscriptions.filter(s=>s.ref.paths.at(-1)===name)
  const emit=(name,data,instance = find(name).length-1)=>{
    const s=find(name)[instance];assert.ok(s,'missing '+name+' subscription '+instance)
    s.emit(data);return render()
  }
  return {subscriptions,find,render,emit,policy,user(uid){currentUser=uid;return render()},
    load() {
      this.emit('lifeMapEvents',[{id:'event-1',value:{title:'Stale historical secret',summary:'Family private context',type:'memory',memoryId:'memory-1',tags:['private-tag'],sourceId:'private-provenance',replayAvailable:true,connectedTo:['private-link']}},
                                    {id:'context-1',value:{title:'Context Event',summary:'Neutral context',type:'relationship'}}])
      this.emit('lifeMapEras',[{id:'era-1',value:{title:'Private Era',summary:'Private decade'}}])
      return this.emit('memories',[{id:'memory-1',value:{ownerId:currentUser,title:'Authorized Memory',summary:'Verified summary',manifest:'manifest-1'}}])
    },
  }
}

test('private event, era, and memory subscriptions require canonical policy admission',()=>{
  const h=harness(), initial=h.render()
  assert.deepEqual([...initial.nodes],[])
  assert.deepEqual([...initial.eras],[])
  assert.equal(h.find('current').length,1)
  assert.equal(h.find('lifeMapEvents').length,0)
  assert.equal(h.find('lifeMapEras').length,0)
  assert.equal(h.find('memories').length,0)
  assert.equal(initial.loading,true)
})
test('grant unlocks owner data only after exact-policy and source snapshots',()=>{
  const h=harness();h.render()
  assert.equal(h.emit('current',h.policy()).nodes.length,0)
  assert.equal(h.find('lifeMapEvents').length,1)
  const visible=h.load()
  assert.equal(visible.sourceMode,'private')
  assert.equal(visible.nodes.find(x=>x.id==='event-1').title,'Authorized Memory')
  assert.equal(visible.nodes.find(x=>x.id==='event-1').replayManifestId,'manifest-1')
  assert.equal(visible.eras[0].title,'Private Era')
})
test('revoking Life Map consent erases visible private constellation/eras and stops source streams',()=>{
  const h=harness();h.render();h.emit('current',h.policy());h.load()
  const prior=[...h.find('lifeMapEvents'),...h.find('lifeMapEras'),...h.find('memories')]
  const denied=h.emit('current',h.policy(2,'paused',false))
  assert.equal(denied.sourceMode,'unavailable')
  assert.equal(denied.nodes.length,0)
  assert.equal(denied.eras.length,0)
  assert.equal(prior.every(s=>s.stopped),true)
  prior[0].emit([{id:'event-1',value:{title:'late private event',type:'memory'}}])
  assert.equal(h.render().nodes.length,0)
})
test('cached same-revision grant cannot restore a revoked private Life Map',()=>{
  const h=harness();h.render();h.emit('current',h.policy(1));h.load()
  h.emit('current',h.policy(2,'denied',false))
  const stale=h.emit('current',h.policy(2,'granted',true))
  assert.equal(stale.nodes.length,0)
  assert.equal(h.find('lifeMapEvents').length,1)
})
test('a newer grant must reobserve all three private source streams before rendering them',()=>{
  const h=harness();h.render();h.emit('current',h.policy(1));h.load()
  h.emit('current',h.policy(2,'paused',false))
  const granted=h.emit('current',h.policy(3))
  assert.equal(granted.nodes.length,0)
  assert.equal(granted.eras.length,0)
  assert.equal(h.find('lifeMapEvents').length,2)
  assert.equal(granted.loading,true)
  const newest=h.load()
  assert.equal(newest.nodes.find(n=>n.id==='event-1').title,'Authorized Memory')
  assert.equal(newest.loading,false)
})
test('per-memory revocation does not leak event-side historical labels or metadata',()=>{
  const h=harness();h.render();h.emit('current',h.policy());h.load()
  const revoked=h.emit('memories',[{id:'memory-1',value:{ownerId:'owner-a',deleted:true,title:'SECRET',manifest:'secret'}}])
  const node=revoked.nodes.find(n=>n.id==='event-1')
  assert.equal(node.authorizedMemory,false)
  assert.equal(node.replayAvailable,false)
  assert.equal(node.locked,true)
  for(const text of [node.title,node.summary,node.subtitle,node.dateLabel,node.sourceId,...(node.tags||[]),...(node.connectedTo||[])]){
    assert.doesNotMatch(String(text),/secret|historical|family|private-provenance|private-link|private-tag|sensitive-date/i)
  }
  assert.equal(node.memoryId,undefined)
})
test('actor change and malformed canonical policies fail closed',()=>{
  const h=harness();h.render();h.emit('current',h.policy());h.load()
  assert.equal(h.user('owner-b').nodes.length,0)
  assert.equal(h.user('owner-b').eras.length,0)
  const denied=h.emit('current',{version:2,revision:100,ownerId:'someone-else',domains:{memory:{mode:'granted',lifeMapVisible:true}},enforcement:{state:'fully-enforced'}},1)
  assert.equal(denied.nodes.length,0)
  assert.equal(denied.sourceMode,'unavailable')
})
test('disclosed demo remains functional without subscribing to private account data',()=>{
  const h=harness('demo-user'),v=h.render()
  assert.equal(v.sourceMode,'explicit-demo')
  assert.ok(v.nodes.some(n=>n.id==='disclosed-demo-star'))
  assert.equal(h.subscriptions.length,0)
})
