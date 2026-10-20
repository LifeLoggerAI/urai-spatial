import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the original hook, with only React scheduling and Firebase I/O mocked.
const source = readFileSync(new URL('../src/spatial/life-movie/useLifeMovieRuntimeManifest.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
// Keep the asynchronous manifest state typed to every parser outcome, not typeof a loading fixture.
assert.match(source, /type ManifestLoadState = LifeMovieManifestResult/)
assert.match(source, /result: ManifestLoadState/)
assert.match(source, /const publish = \(result: ManifestLoadState/)
assert.doesNotMatch(source, /result: typeof LOADING/)
function harness() {
  const auth = { currentUser: null }
  let saved, effect, authCallback, snapshotCallback
  const mockReact = {
    useState(initial) { if (!saved) saved = initial; return [saved, value => { saved = value }] },
    useEffect(callback) { effect = callback },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { module, exports: module.exports, Error, require(id) {
    if (id === 'react') return mockReact
    if (id === 'firebase/auth') return { getAuth: () => auth, onAuthStateChanged(_a, callback) { authCallback = callback; return () => {} } }
    if (id === 'firebase/firestore') return {
      doc: (_db, _users, uid, _movies, movieId) => ({ uid, movieId }),
      onSnapshot(_doc, callback) { snapshotCallback = callback; return () => {} },
    }
    if (id === '@/lib/firebase/client') return { firebasePublicEnvReady: true, app: {}, getFirebaseDb: () => ({}) }
    if (id === './lifeMovieRuntimeContract') return { parseLifeMovieRuntimeManifest: (raw, uid) => ({ status: 'ready', manifest: { id: raw.id, ownerId: uid }, message: 'ready' }) }
    throw new Error('Unexpected module')
  } }, { filename: 'useLifeMovieRuntimeManifest.ts' })
  return {
    auth,
    render: movieId => module.exports.useLifeMovieRuntimeManifest(movieId),
    load: (movieId, user) => {
      effect()
      auth.currentUser = user
      authCallback(user)
      snapshotCallback({ exists: () => true, data: () => ({ id: movieId }) })
    },
  }
}

test('switching movies never exposes the previous ready manifest before effect cleanup', () => {
  const h = harness(), actor = { uid: 'synthetic-owner-a' }
  h.render('movie-a'); h.load('movie-a', actor)
  assert.equal(h.render('movie-a').manifest.id, 'movie-a')
  const changed = h.render('movie-b')
  assert.equal(changed.status, 'loading')
  assert.equal(changed.manifest, null)
  h.load('movie-b', actor)
  assert.equal(h.render('movie-b').manifest.id, 'movie-b')
})

test('switching accounts or signing out immediately hides a previous owner manifest', () => {
  const h = harness(), actor = { uid: 'synthetic-owner-a' }
  h.render('movie-a'); h.load('movie-a', actor)
  assert.equal(h.render('movie-a').status, 'ready')
  h.auth.currentUser = { uid: 'synthetic-owner-b' }
  assert.equal(h.render('movie-a').status, 'loading')
  assert.equal(h.render('movie-a').manifest, null)
  h.auth.currentUser = null
  assert.equal(h.render('movie-a').status, 'loading')
})
