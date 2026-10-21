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

function harness(initialUser = 'owner-a', faults = {}) {
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
    if (faults.memorySubscribeThrows && ref.paths.at(-1) === 'memories') throw new Error('synthetic_firestore_subscription_setup_failed')
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
        ? {status:'unauthorized',memory:null} : {status:'ready',memory:{id,ownerId:owner,
          authorization:'owner',demo:false,deleted:false,
          title:raw.title,summary:raw.summary,privacy:raw.privacy||'private',
          occurredAt:raw.occurredAt||'2026-01-01T00:00:00.000Z',
          star:raw.star||{id,position:[1.5,.5,-8],scale:1,aura:'#aaddff'},
          replayManifest:{id:raw.manifest,segments:[{id:'memory',startsAtMs:0,durationMs:1000}]}}},
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
      memoryId:e.memoryId,privacyLevel:e.privacyLevel,replayAvailable:e.replayAvailable,locked:e.locked||false,
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
test('revoked canonical memory removes its event-backed star rather than leaving a location-shaped shell',()=>{
  const h=harness();h.render();h.emit('current',h.policy());h.load()
  const revoked=h.emit('memories',[{id:'memory-1',value:{ownerId:'owner-a',deleted:true,title:'SECRET',manifest:'secret'}}])
  assert.equal(revoked.nodes.some(n=>n.id==='event-1' || n.memoryId==='memory-1'),false)
  assert.equal(revoked.nodes.some(n=>n.id==='context-1'),true,'unrelated contextual view remains')
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

// Synthetic canonical fixtures: no personal records, source interpretations, or private media.
const canonicalMemory = (id, overrides={}) => ({id,value:{
  ownerId:'owner-a',title:'Synthetic '+id,summary:'Synthetic source',manifest:'manifest-'+id,
  star:{id,position:[3,1,-7],scale:.7,aura:'#88ddff'},privacy:'private',
  ...overrides,
}})
test('unadmitted event-only memory is not a visible galaxy coordinate',()=>{
  const h=harness();h.render();h.emit('current',h.policy())
  h.emit('lifeMapEvents',[{id:'unmatched',value:{type:'memory',memoryId:'memory-missing',title:'Unverified historic source',position:[14,2,18]}}])
  h.emit('lifeMapEras',[])
  const view=h.emit('memories',[])
  assert.equal(view.nodes.some(n=>n.id==='unmatched'),false)
})
test('hidden canonical memory never leaves an event-backed star',()=>{
  const h=harness();h.render();h.emit('current',h.policy())
  h.emit('lifeMapEvents',[{id:'event-hidden',value:{type:'memory',memoryId:'memory-hidden',title:'Prior hidden event'}}])
  h.emit('lifeMapEras',[])
  const view=h.emit('memories',[canonicalMemory('memory-hidden',{privacy:'hidden'})])
  assert.equal(view.nodes.some(n=>n.id==='event-hidden'),false)
})
test('hidden relationship signal is not visible even when general consent is granted',()=>{
  const h=harness();h.render();h.emit('current',h.policy())
  h.emit('lifeMapEvents',[
    {id:'hidden-context',value:{type:'relationship',title:'Hidden relationship',privacyLevel:'hidden'}},
    {id:'public-context',value:{type:'relationship',title:'Unrelated allowed context'}}
  ])
  h.emit('lifeMapEras',[])
  const view=h.emit('memories',[])
  assert.deepEqual([...view.nodes.map(n=>n.id)],['public-context'])
})
test('revoking one memory preserves an unrelated owner-authorized event star',()=>{
  const h=harness();h.render();h.emit('current',h.policy())
  h.emit('lifeMapEvents',[
    {id:'event-one',value:{type:'memory',memoryId:'memory-one',title:'Withdrawn'}},
    {id:'event-two',value:{type:'memory',memoryId:'memory-two',title:'Unrelated'}}
  ])
  h.emit('lifeMapEras',[])
  const view=h.emit('memories',[
    canonicalMemory('memory-one',{consentState:'revoked'}),canonicalMemory('memory-two')
  ])
  assert.equal(view.nodes.some(n=>n.id==='event-one'),false)
  assert.equal(view.nodes.find(n=>n.id==='event-two')?.authorizedMemory,true)
  assert.equal(view.nodes.find(n=>n.id==='event-two')?.replayManifestId,'manifest-memory-two')
})
test('a contextual signal cannot expose a withdrawn canonical memoryId',()=>{
  const h=harness();h.render();h.emit('current',h.policy())
  h.emit('lifeMapEvents',[{id:'context',value:{type:'relationship',title:'Context',memoryId:'memory-removed'}}])
  h.emit('lifeMapEras',[])
  const view=h.emit('memories',[])
  assert.equal(view.nodes.find(n=>n.id==='context')?.memoryId,undefined)
  assert.equal(view.nodes.find(n=>n.id==='context')?.replayManifestId,undefined)
})

// Real source hook harness. These tests assert private memory failure behavior
// without any personal records or a live Firestore/provider account.
test('a canonical memory subscription setup exception fails closed without throwing from the Life Map hook',()=>{
  const h = harness('owner-a', {memorySubscribeThrows: true})
  h.render()
  const view = h.emit('current', h.policy())
  assert.equal(view.sourceMode, 'error')
  assert.match(view.error, /Private memories could not be verified/)
  assert.equal(view.nodes.length, 0)
  assert.equal(view.loading, true, 'other private source streams still require their snapshots')
})
test('malformed memory snapshot clears a previously authorized star and surfaces a safe error',()=>{
  const h = harness()
  h.render(); h.emit('current', h.policy()); h.load()
  const malformed = new Proxy({}, { get() { throw new Error('synthetic-malformed-persisted-memory') } })
  const failed = h.emit('memories', [{id:'memory-1',value:malformed}])
  assert.equal(failed.sourceMode, 'error')
  assert.match(failed.error, /Private memories could not be verified/)
  assert.equal(failed.nodes.some(node=>node.memoryId==='memory-1'), false)
  const recovered = h.emit('memories', [canonicalMemory('memory-1')])
  assert.equal(recovered.sourceMode, 'private')
  assert.equal(recovered.nodes.some(node=>node.memoryId==='memory-1'), true)
})
test('FireStore canonical snapshot error clears all previously joined Memory Stars',()=>{
  const h = harness()
  h.render(); h.emit('current', h.policy()); h.load()
  const subscription = h.find('memories').at(-1)
  subscription.fail()
  const failed = h.render()
  assert.equal(failed.sourceMode, 'error')
  assert.equal(failed.nodes.some(node=>node.memoryId==='memory-1'), false)
  assert.match(failed.error, /Private memories could not be verified/)
})
