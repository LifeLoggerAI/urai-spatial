import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const sourcePath = new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url)
const code = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture() {
  const actor = { uid: 'synthetic-owner' }
  const auth = { currentUser: actor }
  const events = []
  const active = { auth: null, policy: [], memory: [] }
  let cleanup
  const exp = {}
  let selection = null
  const react = {
    useMemo: fn => fn(),
    useState: init => [init, next => { selection = next; events.push(next.result) }],
    useEffect: fn => { cleanup = fn() },
  }
  const modules = {
    react,
    'firebase/auth': { onAuthStateChanged: (_auth, fn) => {active.auth=fn;return ()=>{} } },
    'firebase/firestore': {
      doc: (_db, ...path) => path,
      onSnapshot: (path, fn) => {
        const record = { path, fn, unsubscribed: false }
        if (path.includes('privacyPolicy')) active.policy.push(record)
        else if (path.includes('memories')) active.memory.push(record)
        else throw Error('unexpected path')
        return () => {record.unsubscribed=true}
      },
    },
    '@/lib/firebase/client': { getUraiAuth: () => auth, firebasePublicEnvReady: true, getFirebaseDb: () => ({}) },
    '@/hooks/useBrowserLocation': { useBrowserLocation: () => '/focus?memoryId=synthetic-memory' },
    '@/app/privacy-controls/consentModel': { isConsentPolicy: () => true },
    './explicitDemoMemory': { buildNamedExplicitDemoMemory: () => {throw Error('unexpected demo')} },
    './selectedMemoryContract': {
      isExplicitDemoRequest: () => false,
      sanitizeMemoryId: x => x || null,
      parseSelectedMemory: (raw, ownerId, memoryId) => ({
        status:'ready', message:'Ready', memory:{ id:memoryId, ownerId, title:raw.title, replayManifest:{id:'manifest'} },
      }),
    },
  }
  vm.runInNewContext(code, {
    exports: exp,
    require: name => {
      if (!Object.hasOwn(modules, name)) throw Error('unexpected import '+name)
      return modules[name]
    },
    URLSearchParams, process: { env: { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'synthetic-bucket' } },
  }, { filename:'useSelectedMemory.ts' })
  exp.useSelectedMemory()
  return {
    actor, auth, active, events,
    getSelection:()=>selection,
    cleanup:()=>cleanup?.(),
    policy(index=active.policy.length-1, revision=1) {
      active.policy[index].fn({exists:()=>true, data:()=>({ revision,
        enforcement:{state:'fully-enforced'},
        domains:{memory:{mode:'granted',lifeMapVisible:true,replayVisible:true}},
      })})
    },
    memory(title, index=active.memory.length-1) {
      active.memory[index].fn({exists:()=>true,data:()=>({title})})
    },
  }
}

test('real selected-memory loader never publishes old-owner Firestore data after auth pointer rotates', () => {
  const f=fixture()
  try {
    f.active.auth(f.actor)
    f.policy()
    f.memory('before-owner-rotation')
    assert.equal(f.getSelection().result.status,'ready')
    const eventsBefore=f.events.length
    f.auth.currentUser = {uid:f.actor.uid}
    // Firestore callback can be delivered before onAuthStateChanged notifies this hook.
    f.memory('PRIVATE_STALE_ACTOR_EVENT')
    assert.equal(f.events.length, eventsBefore, 'old owner must never update private UI after auth actor replacement')
    assert.ok(!f.events.some(e => e.memory?.title==='PRIVATE_STALE_ACTOR_EVENT'))
  } finally {f.cleanup()}
})

test('legitimate current actor can load and rotated new actor can recover with a fresh policy', () => {
  const f=fixture()
  try {
    f.active.auth(f.actor)
    f.policy()
    f.memory('first-owner-visible')
    assert.equal(f.getSelection().result.memory.title, 'first-owner-visible')
    const newerActor={uid:f.actor.uid}
    f.auth.currentUser=newerActor
    f.active.auth(newerActor)
    f.policy()
    f.memory('new-owner-visible')
    assert.equal(f.getSelection().result.memory.title, 'new-owner-visible')
    assert.equal(f.getSelection().result.memory.ownerId, 'synthetic-owner')
  } finally {f.cleanup()}
})

test('delayed old auth notification cannot authorize new private subscription', () => {
  const f=fixture()
  try {
    const newerActor={uid:f.actor.uid}
    f.auth.currentUser=newerActor
    f.active.auth(f.actor)
    const count=f.active.memory.length
    f.policy()
    assert.equal(f.active.memory.length,count,'stale auth callback cannot authorize memory subscription')
  } finally {f.cleanup()}
})

test('revocation detaches private memory and a same-revision regrant cannot reopen it', () => {
  const f=fixture()
  try {
    f.active.auth(f.actor)
    f.policy(undefined, 4)
    f.memory('initial-private')
    assert.equal(f.getSelection().result.status, 'ready')
    const originalMemory = f.active.memory.at(-1)
    const policy = f.active.policy.at(-1)
    const send = (revision, mode) => policy.fn({exists:()=>true,data:()=>({revision,
      enforcement:{state:'fully-enforced'},domains:{memory:{mode,lifeMapVisible:true,replayVisible:true}},
    })})
    send(4, 'revoked')
    assert.equal(f.getSelection().result.status, 'unauthorized')
    assert.equal(originalMemory.unsubscribed, true)
    const before=f.events.length
    originalMemory.fn({exists:()=>true,data:()=>({title:'REVOKED_SOURCE_LEAK'})})
    assert.equal(f.events.length, before, 'detached memory must never publish after revocation')
    send(4,'granted')
    assert.equal(f.getSelection().result.status, 'unauthorized','same policy revision cannot bypass revocation')
    send(5,'granted')
    f.memory('regranted-newer-policy')
    assert.equal(f.getSelection().result.memory.title, 'regranted-newer-policy')
  } finally { f.cleanup() }
})

test('older policy snapshots fail closed after a newer policy revision was accepted', () => {
  const f=fixture()
  try {
    f.active.auth(f.actor)
    f.policy(undefined, 8)
    f.memory('new-revision-private')
    const before = f.active.memory.at(-1)
    f.policy(undefined, 7)
    assert.equal(before.unsubscribed, true)
    assert.equal(f.getSelection().result.status, 'unavailable')
    assert.match(f.getSelection().result.message, /stale/i)
    const events=f.events.length
    before.fn({exists:()=>true,data:()=>({title:'STALE_POLICY_MEMORY_LEAK'})})
    assert.equal(f.events.length, events)
  } finally { f.cleanup() }
})

test('detached old memory snapshot cannot override new policy subscription', () => {
  const f=fixture()
  try {
    f.active.auth(f.actor)
    f.policy(undefined, 1)
    f.memory('first')
    const original=f.active.memory.at(-1)
    f.policy(undefined, 2)
    assert.equal(original.unsubscribed, true)
    f.memory('under-new-revision')
    const events=f.events.length
    original.fn({exists:()=>true,data:()=>({title:'DETACHED_OLD_SOURCE'})})
    assert.equal(f.events.length, events)
    assert.equal(f.getSelection().result.memory.title, 'under-new-revision')
  } finally { f.cleanup() }
})

test('old auth actor callback cannot overwrite newly authorized actor memory', () => {
  const f=fixture()
  try {
    f.active.auth(f.actor)
    f.policy(undefined, 1)
    f.memory('old-authorized')
    const oldPolicy=f.active.policy.at(-1), oldMemory=f.active.memory.at(-1)
    const newActor={uid:f.actor.uid}
    f.auth.currentUser=newActor
    f.active.auth(newActor)
    f.policy(undefined, 2)
    f.memory('new-authorized')
    const events=f.events.length
    oldPolicy.fn({exists:()=>true,data:()=>({revision:999,
      enforcement:{state:'fully-enforced'},domains:{memory:{mode:'granted',lifeMapVisible:true,replayVisible:true}},
    })})
    oldMemory.fn({exists:()=>true,data:()=>({title:'OLD_ACTOR_CALLBACK_LEAK'})})
    assert.equal(f.events.length, events)
    assert.equal(f.getSelection().result.memory.title, 'new-authorized')
  } finally { f.cleanup() }
})
