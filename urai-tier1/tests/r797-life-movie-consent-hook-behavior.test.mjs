import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const base = new URL('../src/', import.meta.url)
function load(path, imports = {}, globals = {}) {
  const source = readFileSync(new URL(path, base), 'utf8')
  const output = ts.transpileModule(source, {fileName:path, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}})
  const module = { exports:{} }
  vm.runInNewContext(output.outputText,{module,exports:module.exports,require(name){
    assert.ok(Object.hasOwn(imports,name),'Unexpected dependency '+name)
    return imports[name]
  },...globals},{filename:path})
  return module.exports
}
const consent = load('app/privacy-controls/consentModel.ts',{}, {Object,Reflect,Set,Array,Number})
const epoch = load('spatial/life-movie/lifeMovieConsentEpoch.ts',
  {'@/app/privacy-controls/consentModel':consent},{Number,Math})
const ownerId = 'synthetic-owner-001'
function policy(owner,revision=7,overrides={}) {
  const value=consent.defaultConsentPolicy(owner)
  value.revision=revision
  if (overrides.memory) Object.assign(value.domains.memory,overrides.memory)
  if (overrides.enforcement) Object.assign(value.enforcement,overrides.enforcement)
  return value
}
function harness(initialOwner=ownerId) {
  let activeUser={uid:initialOwner}
  const listeners=[],effects=[]
  const react={
    useState(initial){return [typeof initial==='function'?initial():initial,()=>{}]},
    useRef(initial){return {current:initial}},
    useCallback(callback){return callback},
    useEffect(effect){effects.push(effect)},
  }
  const auth={get currentUser(){return activeUser}}
  const deps={
    react,
    'firebase/auth':{getAuth:()=>auth},
    'firebase/firestore':{
      doc:(_db,...parts)=>parts.join('/'),
      onSnapshot:(p,next,error)=>{
        const sub={path:p,next,error,detached:false};listeners.push(sub)
        return ()=>{sub.detached=true}
      },
    },
    '@/lib/firebase/client':{app:{},firebasePublicEnvReady:true,getFirebaseDb:()=>({})},
    './lifeMovieConsentEpoch':epoch,
  }
  const hook=load('spatial/life-movie/useLifeMovieConsentEpoch.ts',deps).useLifeMovieConsentEpoch(activeUser)
  const cleanup=effects[0]()
  assert.equal(listeners.length,1)
  const notify=(value)=>listeners[0].next({exists:()=>value!==undefined,data:()=>value})
  const error=()=>listeners[0].error(new Error('synthetic Firestore error'))
  return {hook, listeners,notify,error,cleanup,setActiveUser(user){activeUser=user}}
}

test('real Life Movie hook requires current owner policy before admitting content',()=>{
  const h=harness()
  try {
    assert.equal(h.listeners[0].path,'users/'+ownerId+'/privacyPolicy/current')
    assert.equal(h.hook.isCurrent(ownerId,7),false)
  } finally {h.cleanup()}
})
test('real hook admits exact live owner and denies wrong actor or revision',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    assert.equal(h.hook.isCurrent(ownerId,7),true)
    assert.equal(h.hook.isCurrent(ownerId,6),false)
    assert.equal(h.hook.isCurrent('foreign-owner',7),false)
  } finally {h.cleanup()}
})
test('real hook revokes and cannot regrant same denied epoch',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    h.notify(policy(ownerId,8,{memory:{mode:'denied',replayVisible:false}}))
    assert.equal(h.hook.isCurrent(ownerId,7),false)
    h.notify(policy(ownerId,8))
    assert.equal(h.hook.isCurrent(ownerId,8),false)
    h.notify(policy(ownerId,9))
    assert.equal(h.hook.isCurrent(ownerId,9),true)
  } finally {h.cleanup()}
})
test('real hook denies cached stale grant until newer authorized epoch',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    h.notify(policy(ownerId,8))
    h.notify(policy(ownerId,7))
    assert.equal(h.hook.isCurrent(ownerId,8),false)
    h.notify(policy(ownerId,8))
    assert.equal(h.hook.isCurrent(ownerId,8),false)
    h.notify(policy(ownerId,9))
    assert.equal(h.hook.isCurrent(ownerId,9),true)
  } finally {h.cleanup()}
})
test('real hook invalidates authorization on Firestore listener error',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    assert.equal(h.hook.isCurrent(ownerId,7),true)
    h.error()
    assert.equal(h.hook.isCurrent(ownerId,7),false)
    h.notify(policy(ownerId,7))
    assert.equal(h.hook.isCurrent(ownerId,7),false)
  } finally {h.cleanup()}
})
test('real hook rejects same-uid session replacement and late callbacks',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    assert.equal(h.hook.isCurrent(ownerId,7),true)
    h.setActiveUser({uid:ownerId})
    assert.equal(h.hook.isCurrent(ownerId,7),false)
    h.notify(policy(ownerId,8))
    assert.equal(h.hook.isCurrent(ownerId,8),false)
    h.cleanup()
    assert.equal(h.listeners[0].detached,true)
    h.notify(policy(ownerId,9))
    assert.equal(h.hook.isCurrent(ownerId,9),false)
  } finally {h.cleanup()}
})
test('real hook rejects malformed policy after prior positive grant',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    assert.equal(h.hook.isCurrent(ownerId,7),true)
    h.notify({ownerId,version:2,revision:8})
    assert.equal(h.hook.isCurrent(ownerId,7),false)
    assert.equal(h.hook.isCurrent(ownerId,8),false)
  } finally {h.cleanup()}
})
test('real hook requires enforced policy and newer revision after suspended enforcement',()=>{
  const h=harness()
  try {
    h.notify(policy(ownerId))
    h.notify(policy(ownerId,8,{enforcement:{state:'pending'}}))
    assert.equal(h.hook.isCurrent(ownerId,8),false)
    h.notify(policy(ownerId,8))
    assert.equal(h.hook.isCurrent(ownerId,8),false)
    h.notify(policy(ownerId,9))
    assert.equal(h.hook.isCurrent(ownerId,9),true)
  } finally {h.cleanup()}
})
