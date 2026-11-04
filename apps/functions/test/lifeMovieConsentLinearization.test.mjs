import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const requireFromFunctions = createRequire(new URL('../package.json', import.meta.url))
const ts = requireFromFunctions('typescript')
const source = readFileSync(new URL('../src/lifeMovie.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
})
assert.equal(
  (compiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length,
  0, 'Original Life Movie callable source must transpile',
)

const UID = 'synthetic-owner-1'
const MEMORY = 'users/' + UID + '/memories/memory-1'
const MOVIE = 'users/' + UID + '/lifeMovies/movie-1'
const input = Object.freeze({
  movieId: 'movie-1', status: 'draft',
  chapters: [{ id: 'chapter-1', memoryId: 'memory-1', order: 0 }],
})
const context = Object.freeze({ auth: { uid: UID } })

function environment(options = {}) {
  // A supplied undefined value is an explicitly MISSING consent field, never
  // the authorized default. Do not let JS parameter defaults hide this case.
  const { manifest = null, onTransactionStart: hook, failAudit = false } = options
  let onTransactionStart = hook
  const consent = Object.prototype.hasOwnProperty.call(options, 'consent')
    ? options.consent : 'authorized'
  const docs = new Map()
  docs.set(MEMORY, { ownerId: UID, consentState: consent, deleted: false })
  if (manifest) docs.set(MOVIE, { ownerId: UID, ...manifest })
  let serial = 0

  const ref = path => {
    const pieces = path.split('/')
    const reference = {
      path,
      id: pieces.at(-1),
      parent: { parent: { id: pieces.at(-3) } },
      get: async () => snapshot(reference),
      set: async (value, options) => setDoc(reference, value, options),
    }
    return reference
  }
  const snapshot = reference => {
    const value = docs.get(reference.path)
    const pinned = value ? { ...value } : null
    return {
      ref: reference, exists: pinned !== null,
      id: reference.id,
      get: field => pinned?.[field],
      data: () => pinned && { ...pinned },
    }
  }
  const setDoc = (reference, value, options) =>
    docs.set(reference.path, options?.merge
      ? { ...(docs.get(reference.path) ?? {}), ...value }
      : { ...value })
  const db = {
    doc: ref,
    getAll: async (...references) => references.map(snapshot),
    collection(path) {
      return {
        doc: (key) => ref(path + '/' + (key ?? 'audit-' + (++serial))),
        add: async value => {
          if (failAudit) throw Error('synthetic-audit-write-denied')
          docs.set(path + '/audit-' + (++serial), { ...value })
        },
      }
    },
    async runTransaction(callback) {
      if (onTransactionStart) {
        onTransactionStart(docs)
        onTransactionStart = undefined
      }
      const staged = []
      const tx = {
        get: async reference => snapshot(reference),
        set: (reference, value, options) =>
          staged.push({ reference, value, options }),
        create: (reference, value) => {
          if (failAudit && reference.path.includes('/privacyAudit/')) {
            throw Error('synthetic-audit-write-denied')
          }
          staged.push({ reference, value, options: undefined })
        },
      }
      const result = await callback(tx)
      for (const item of staged) setDoc(item.reference, item.value, item.options)
      return result
    },
  }
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code }
  }
  const fnApi = {
    region: () => ({ https: { onCall: handler => handler } }),
    https: { HttpsError },
  }
  function firestore() { return db }
  firestore.FieldValue = { serverTimestamp: () => 'synthetic-server-timestamp' }
  const admin = { apps: [{}], initializeApp() {}, firestore }
  const loader = name => {
    if (name === 'firebase-functions/v1') return fnApi
    if (name === 'firebase-admin') return admin
    throw Error('Unexpected private dependency: ' + name)
  }
  const module = { exports: {} }
  new Function('module', 'exports', 'require', compiled.outputText)(
    module, module.exports, loader,
  )
  return { callables: module.exports, docs }
}

test('only explicitly authorized source consent may enter a Life Movie', async () => {
  const allowed = environment({ consent: 'authorized' })
  const result = await allowed.callables.upsertLifeMovieManifest(input, context)
  assert.equal(result.movieId, 'movie-1')
  assert.equal(allowed.docs.get(MOVIE)?.consentState, 'authorized')

  for (const consent of [undefined, null, '', false, 'unknown', 'denied', 'pending', 'revoked']) {
    const world = environment({ consent })
    await assert.rejects(
      world.callables.upsertLifeMovieManifest(input, context),
      error => error.code === 'failed-precondition',
      'Invalid/absent memory consent must DENY: ' + String(consent),
    )
    assert.equal(world.docs.has(MOVIE), false)
  }
})

test('withdrawal between source read and manifest transaction must deny creation', async () => {
  const world = environment({
    consent: 'authorized',
    onTransactionStart: docs => { docs.get(MEMORY).consentState = 'revoked' },
  })
  await assert.rejects(
    world.callables.upsertLifeMovieManifest(input, context),
    error => error.code === 'failed-precondition',
  )
  assert.equal(world.docs.has(MOVIE), false)
})

test('a revoked movie ID cannot silently become authorized on upsert', async () => {
  const world = environment({ manifest: { consentState: 'revoked', version: 1, status: 'draft' } })
  await assert.rejects(
    world.callables.upsertLifeMovieManifest(input, context),
    error => error.code === 'failed-precondition',
  )
  assert.equal(world.docs.get(MOVIE)?.consentState, 'revoked')
})

test('revocation and its audit must commit together or not at all', async () => {
  const world = environment({
    manifest: { consentState: 'authorized', version: 1, status: 'ready' },
    failAudit: true,
  })
  await assert.rejects(
    world.callables.revokeLifeMovieManifest({ movieId: 'movie-1' }, context),
    /synthetic-audit-write-denied/,
  )
  assert.equal(world.docs.get(MOVIE)?.consentState, 'authorized')
})

test('a successful revoke durably marks the movie and writes its audit', async () => {
  const world = environment({ manifest: { consentState: 'authorized', version: 1, status: 'ready' } })
  const result = await world.callables.revokeLifeMovieManifest({ movieId: 'movie-1' }, context)
  assert.deepEqual(result, { movieId: 'movie-1', revoked: true })
  assert.equal(world.docs.get(MOVIE)?.consentState, 'revoked')
  assert.equal(world.docs.get(MOVIE)?.status, 'draft')
  const audits = [...world.docs].filter(([path]) => path.startsWith('users/' + UID + '/privacyAudit/'))
  assert.equal(audits.length, 1)
  assert.equal(audits[0][1].kind, 'life_movie.manifest_revoked')
})
