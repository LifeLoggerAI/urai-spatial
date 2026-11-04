import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import {
  liveLifeMovieManifestAuthority,
  parseLifeMovieRuntimeManifest,
  scopedLifeMovieClientMemory,
} from '../src/spatial/life-movie/lifeMovieRuntimeContract.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const hookSource = read('src/spatial/life-movie/useLifeMovieRuntimeManifest.ts')
const clientSource = read('src/app/life-movie/LifeMovieClient.tsx')

const live = { fromCache: false, hasPendingWrites: false }
const cached = { fromCache: true, hasPendingWrites: false }
const pending = { fromCache: false, hasPendingWrites: true }

function runActualHook() {
  const statuses = []
  const listeners = new Map()
  const auth = { currentUser: { uid: 'owner-a' } }
  let subscribed, authCallback, manifestOptions, cleanup, listenerStops = 0
  const react = {
    useState: initial => [initial, state => { statuses.push(state) }],
    useEffect: effect => { cleanup = effect() },
  }
  const window = {
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event, callback) => {
      if (listeners.get(event) === callback) listeners.delete(event)
    },
  }
  const navigator = { onLine: true }
  const compiled = ts.transpileModule(hookSource, {
    fileName: 'useLifeMovieRuntimeManifest.ts',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  assert.equal((compiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
  const module = { exports: {} }
  const loader = name => {
    if (name === 'react') return react
    if (name === 'firebase/auth') return {
      getAuth: () => auth,
      onAuthStateChanged: (_auth, callback) => {
        authCallback = callback
        callback(auth.currentUser)
        return () => {}
      },
    }
    if (name === 'firebase/firestore') return {
      doc: (_db, ...parts) => parts.join('/'),
      onSnapshot: (_doc, options, callback, _error) => {
        manifestOptions = options
        subscribed = callback
        return () => { listenerStops += 1 },
      },
    }
    if (name === '@/lib/firebase/client') return {
      app: {}, firebasePublicEnvReady: true, getFirebaseDb: () => ({}),
    }
    if (name === './lifeMovieRuntimeContract') return {
      liveLifeMovieManifestAuthority, parseLifeMovieRuntimeManifest,
    }
    throw Error('Unrecognized runtime dependency: ' + name)
  }
  vm.runInNewContext(compiled.outputText, { exports: module.exports, module, require: loader, window, navigator })
  module.exports.useLifeMovieRuntimeManifest('movie-a')
  const emit = (metadata, consentState = 'authorized') => {
    subscribed({
      metadata,
      exists: () => true,
      data: () => ({
        id: 'movie-a', ownerId: 'owner-a', version: 1,
        consentState, status: 'draft', chapters: [],
      }),
    })
    return statuses.at(-1)
  }
  return { statuses, emit, listeners, navigator, auth, signOut: () => {
    auth.currentUser = null
    authCallback(null)
  }, options: () => manifestOptions, stops: () => listenerStops, cleanup: () => cleanup?.() }
}

test('cache, pending writes, missing metadata and offline are NEVER evidence of owner authorization', () => {
  for (const metadata of [cached, pending, null, undefined, {}, {fromCache: false}, {hasPendingWrites: false}])
    assert.equal(liveLifeMovieManifestAuthority(metadata, true), false)
  assert.equal(liveLifeMovieManifestAuthority(live, false), false)
  assert.equal(liveLifeMovieManifestAuthority(live, true), true)
})

test('actual Life Movie hook refuses cached authorized data and admits server-confirmed data only', () => {
  const h = runActualHook()
  assert.equal(h.options().includeMetadataChanges, true)
  assert.equal(h.emit(cached).status, 'unavailable')
  assert.equal(h.emit(pending).status, 'unavailable')
  assert.equal(h.emit(undefined).status, 'unavailable')
  assert.equal(h.emit(live).status, 'ready')
  assert.equal(h.emit(live).manifest.id, 'movie-a')
  h.cleanup()
  assert.equal(h.stops(), 1)
  assert.equal(h.listeners.size, 0)
})

test('actual hook drops prior authorization on offline, reconnect and revoked server snapshot', () => {
  const h = runActualHook()
  assert.equal(h.emit(live).status, 'ready')
  h.navigator.onLine = false
  h.listeners.get('offline')()
  assert.equal(h.statuses.at(-1).status, 'unavailable')
  assert.equal(h.emit(live).status, 'unavailable')
  h.navigator.onLine = true
  assert.equal(h.emit(cached).status, 'unavailable')
  assert.equal(h.emit(live).status, 'ready')
  assert.equal(h.emit(live, 'revoked').status, 'unauthorized')
  assert.equal(h.statuses.at(-1).manifest, null)
  h.cleanup()
})

test('old async subscription cannot restore a movie after owner signs out', () => {
  const h = runActualHook()
  assert.equal(h.emit(live).status, 'ready')
  const before = h.statuses.length
  h.signOut()
  assert.equal(h.statuses.at(-1).status, 'unauthorized')
  assert.equal(h.stops(), 1)
  h.emit(live)
  assert.equal(h.statuses.length, before + 1)
  h.cleanup()
})

function makeResult(movieId = 'movie-a', ownerId = 'owner-a', memoryId = 'memory-a') {
  return {
    status: 'ready', message: 'live manifest',
    manifest: {
      id: movieId, ownerId, version: 1, status: 'draft',
      chapters: [{ id: 'chapter-a', memoryId, order: 0, consentState: 'authorized' }],
    },
  }
}
const memory = { id: 'memory-a', ownerId: 'owner-a', authorization: 'owner',
  deleted: false, privacy: 'private', demo: false }

test('same-render chapter scope blocks revoked, loading, corrupt and switched movie authority', () => {
  const allowed = makeResult()
  assert.equal(scopedLifeMovieClientMemory(memory, 'owner-a', 'movie-a', allowed), memory)
  for (const status of ['loading', 'unavailable', 'corrupt', 'unauthorized']) {
    assert.equal(scopedLifeMovieClientMemory(memory, 'owner-a', 'movie-a',
      { status, manifest: null }), null)
  }
  assert.equal(scopedLifeMovieClientMemory(memory, 'owner-a', 'movie-b', allowed), null)
  assert.equal(scopedLifeMovieClientMemory(memory, 'owner-a', 'movie-a', makeResult('movie-a', 'other-owner')), null)
  assert.equal(scopedLifeMovieClientMemory(memory, 'owner-a', 'movie-a', makeResult('movie-a', 'owner-a', 'another-memory')), null)
  assert.equal(scopedLifeMovieClientMemory(memory, 'other-owner', 'movie-a', allowed), null)
  assert.equal(scopedLifeMovieClientMemory({ ...memory, ownerId: 'other-owner' }, 'owner-a', 'movie-a', allowed), null)
  assert.equal(scopedLifeMovieClientMemory({ ...memory, authorization: 'none' }, 'owner-a', 'movie-a', allowed), null)
  assert.equal(scopedLifeMovieClientMemory({ ...memory, privacy: 'hidden' }, 'owner-a', 'movie-a', allowed), null)
  assert.equal(scopedLifeMovieClientMemory({ ...memory, deleted: true }, 'owner-a', 'movie-a', allowed), null)
  assert.equal(scopedLifeMovieClientMemory({ ...memory, demo: true }, 'owner-a', 'movie-a', allowed), null)
})

test('ad-hoc private owner-memory sequence remains usable without invented movie authorization', () => {
  assert.equal(scopedLifeMovieClientMemory(memory, 'owner-a', null, { status: 'loading', manifest: null }), memory)
  assert.equal(scopedLifeMovieClientMemory(memory, null, null, { status: 'loading', manifest: null }), null)
  assert.equal(scopedLifeMovieClientMemory({ ...memory, ownerId: 'foreign' }, 'owner-a', null,
    { status: 'loading', manifest: null }), null)
})

test('actual React client binds media selection to the synchronous guard before playback hooks', () => {
  assert.match(clientSource, /const active = scopedLifeMovieClientMemory\(memories\[activeIndex\] \?\? null,/)
  assert.match(clientSource, /const visibility = useReplayMemoryVisibility\(active\)/)
  assert.match(clientSource, /useOwnedMemoryMediaPlayback\(visibility !== 'visible'/)
  assert.match(clientSource, /const media = active \? mediaFor/)
  assert.match(clientSource, /runtimeManifest\.manifest\.ownerId !== user\.uid/)
  assert.match(clientSource, /data-state=\{waiting \? 'loading' : 'unavailable'\}/)
  assert.doesNotMatch(clientSource, /const active = memories\[activeIndex\] \?\? null/)
  assert.match(hookSource, /includeMetadataChanges: true/)
  assert.match(hookSource, /window\.addEventListener\('offline', onOffline\)/)
  assert.match(hookSource, /liveLifeMovieManifestAuthority\(snapshot\.metadata, navigator\.onLine !== false\)/)
})
