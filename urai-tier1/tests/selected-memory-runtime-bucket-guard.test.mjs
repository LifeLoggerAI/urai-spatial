import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve('src/spatial/memory')
function load(source, name, dependencies = {}, globals = {}) {
  const javascript = ts.transpileModule(source, {
    fileName: name,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  assert.equal(javascript.diagnostics?.length ?? 0, 0)
  const module = { exports: {} }
  vm.runInNewContext(javascript.outputText, {
    module, exports: module.exports, URL, URLSearchParams, ...globals,
    require(id) { assert.ok(Object.hasOwn(dependencies, id), 'unexpected dependency: ' + id); return dependencies[id] },
  }, { filename: name })
  return module.exports
}
const contractSource = fs.readFileSync(path.join(root, 'selectedMemoryContract.ts'), 'utf8')
const hookSource = fs.readFileSync(path.join(root, 'useSelectedMemory.ts'), 'utf8')
const contract = load(contractSource, 'selectedMemoryContract.ts')

function mount(bucket) {
  let current, registeredEffect, authListener
  const subscriptions = []
  const react = {
    useMemo: callback => callback(),
    useEffect: callback => { registeredEffect = callback },
    useState: initial => {
      if (current === undefined) current = initial
      return [current, next => { current = typeof next === 'function' ? next(current) : next }]
    },
  }
  const imports = {
    react,
    'firebase/firestore': {
      doc: (_database, ...parts) => parts,
      onSnapshot: (ref, options, receive) => {
        assert.equal(options.includeMetadataChanges, true, 'private listeners require metadata events')
        const entry = { ref, receive }
        subscriptions.push(entry)
        return () => { entry.stopped = true }
      },
    },
    'firebase/auth': {
      getAuth: () => ({}),
      onAuthStateChanged: (_auth, listener) => { authListener = listener; return () => {} },
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => ({}) },
    '@/hooks/useBrowserLocation': { useBrowserLocation: () => '/replay?memoryId=synthetic-memory' },
    '@/app/privacy-controls/consentModel': { isConsentPolicy: (value, uid) => value?.ownerId === uid && Number.isInteger(value.revision) },
    './explicitDemoMemory': { buildNamedExplicitDemoMemory: contract.buildExplicitDemoMemory },
    './selectedMemoryContract': contract,
  }
  const processEnv = bucket === undefined ? {} : { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket }
  const hooks = load(hookSource, 'useSelectedMemory.ts', imports, { process: { env: processEnv } })
  hooks.useSelectedMemory()
  const unmount = registeredEffect()
  assert.equal(typeof authListener, 'function')
  authListener({ uid: 'synthetic-owner' })
  const policy = subscriptions.find(({ ref }) => ref.includes('privacyPolicy'))
  assert.ok(policy)
  policy.receive({ exists: () => true, metadata: { fromCache: false, hasPendingWrites: false }, data: () => ({ ownerId: 'synthetic-owner', revision: 1,
    domains: { memory: { mode: 'granted', lifeMapVisible: true, replayVisible: true } },
    enforcement: { state: 'fully-enforced' },
  }) })
  const subscription = subscriptions.find(({ ref }) => ref.includes('memories'))
  assert.ok(subscription)
  return {
    load(record) {
      subscription.receive({ exists: () => true, metadata: { fromCache: false, hasPendingWrites: false }, data: () => record })
      return hooks.useSelectedMemory()
    },
    unmount,
  }
}

const foreign = 'https://fictional-foreign.example/private-media?key=synthetic'
const local = 'https://firebasestorage.googleapis.com/v0/b/urai-4dc1d.appspot.com/o/synthetic%2Ffile?alt=media'
function memory(mediaUrl = foreign) {
  return {
    ...contract.buildExplicitDemoMemory('synthetic-memory'),
    ownerId: 'synthetic-owner', demo: false, consentState: 'authorized',
    sourceMedia: [{ kind: 'image', url: mediaUrl }],
    replayManifest: { ...contract.buildExplicitDemoMemory('synthetic-memory').replayManifest, audioUrl: foreign },
  }
}

test('runtime with missing bucket never admits foreign image or replay audio URLs', () => {
  const h = mount(undefined)
  try {
    const result = h.load(memory())
    assert.equal(result.status, 'ready')
    assert.deepEqual(Array.from(result.memory.sourceMedia), [])
    assert.equal(result.memory.replayManifest.audioUrl, undefined)
  } finally { h.unmount() }
})

test('runtime with matching bucket admits only its own HTTPS Storage URLs', () => {
  const h = mount('urai-4dc1d.appspot.com')
  try {
    const result = h.load(memory(local))
    assert.equal(result.status, 'ready')
    assert.equal(result.memory.sourceMedia.length, 1)
    assert.equal(result.memory.sourceMedia[0].url, local)
    assert.equal(result.memory.replayManifest.audioUrl, undefined)
  } finally { h.unmount() }
})

test('non-runtime parsing retains its documented omitted-bucket behavior', () => {
  const result = contract.parseSelectedMemory(memory(), 'synthetic-owner', 'synthetic-memory')
  assert.equal(result.status, 'ready')
  assert.equal(result.memory.sourceMedia[0].url, foreign)
})
