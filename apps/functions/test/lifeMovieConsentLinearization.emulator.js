'use strict'
/**
 * R525: actual compiled Spatial Life Movie callables using the disposable
 * Firestore emulator and real firebase-admin transactions.
 *
 * Test-only authenticated context is synthetic: no Firebase Auth/App Check,
 * Firestore Rules, production IAM, source-rights grant or deployment approval.
 * This file intentionally does NOT match *.test.js, so the ordinary native
 * suite cannot accidentally run it without a Firebase emulator.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { test, after } = require('node:test')

const project = 'demo-urai-spatial-r525-life-movie'
const host = process.env.FIRESTORE_EMULATOR_HOST
if (process.env.URAI_R525_EMULATOR_PROOF !== '1'
 || process.env.GCLOUD_PROJECT !== project
 || !/^127[.]0[.]0[.]1:[0-9]+$/.test(host || '')
 || process.env.GOOGLE_APPLICATION_CREDENTIALS
 || process.env.FIREBASE_TOKEN
 || (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_PROJECT !== project)) {
  throw new Error('R525 refuses non-emulator authority or inherited credentials')
}
const admin = require('firebase-admin')
const functions = require('firebase-functions/v1')
const app = admin.initializeApp({ projectId:project })
const db = admin.firestore(app)
db.settings({host, ssl:false})
const compiledPath = path.resolve(__dirname, '../lib/apps/functions/src/lifeMovie.js')
const compiled = fs.readFileSync(compiledPath, 'utf8')
const originalSource = fs.readFileSync(path.resolve(__dirname, '../src/lifeMovie.ts'), 'utf8')
assert.ok(originalSource.includes('consentState !== ' + "'authorized'"))
assert.ok(originalSource.includes('refs.map((sourceRef) => transaction.get(sourceRef))'))
const compiledDigest = crypto.createHash('sha256').update(compiled).digest('hex')
console.log('R525_REAL_FIRESTORE_SOURCE_COMPILED_SHA256=' + compiledDigest)
console.log('R525_EMULATOR_PROJECT=' + project)
const wrap = vm.runInThisContext(
  '(function(exports, require, module, __filename, __dirname) {\n' + compiled + '\n})',
  {filename:compiledPath}
)
function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return {promise, resolve}
}
function holdBefore(path) {
  return {path, reached:deferred(), release:deferred(), entered:false}
}
function callableAdapter({hold = null, failAudit = false} = {}) {
  const facadeDb = {
    doc:p => db.doc(p),
    collection:p => db.collection(p),
    runTransaction:(callback) => db.runTransaction((tx) => callback({
      async get(ref) {
        // The underlying tx.get is the real Firestore SDK operation.
        // External revocation completes before this exact source read.
        if (hold && ref.path === hold.path && !hold.entered) {
          hold.entered = true
          hold.reached.resolve()
          await hold.release.promise
        }
        return tx.get(ref)
      },
      set:(...args) => tx.set(...args),
      create:(ref, value) => {
        if (failAudit && ref.path.includes('/privacyAudit/')) {
          throw Error('R525_SYNTHETIC_AUDIT_FAILURE')
        }
        return tx.create(ref, value)
      },
    })),
  }
  const fakeAdmin = {
    apps:[app],
    initializeApp() { throw Error('R525 must not initialize another Firebase app') },
    firestore:Object.assign(() => facadeDb, {FieldValue:admin.firestore.FieldValue}),
  }
  const holder = {exports:{}}
  wrap(holder.exports, name => {
    if (name === 'firebase-functions/v1') return functions
    if (name === 'firebase-admin') return fakeAdmin
    throw Error('R525 unexpected compiled dependency: ' + name)
  }, holder, compiledPath, path.dirname(compiledPath))
  assert.equal(typeof holder.exports.upsertLifeMovieManifest.run, 'function')
  assert.equal(typeof holder.exports.revokeLifeMovieManifest.run, 'function')
  return holder.exports
}
const original = callableAdapter()
const uidFor = kind => 'synthetic-r525-' + kind
const memoryPath = uid => 'users/' + uid + '/memories/memory-1'
const moviePath = uid => 'users/' + uid + '/lifeMovies/movie-1'
const scenePath = uid => 'users/' + uid + '/sceneTruthPackets/scene-1'
const bundlePath = uid => 'users/' + uid + '/personModelBundles/bundle-1'
const auditCollection = uid => db.collection('users/' + uid + '/privacyAudit')
const request = (status = 'draft') => ({
  movieId:'movie-1', status, chapters:[{id:'chapter-1',memoryId:'memory-1',order:0}],
})
const identity = uid => ({auth:{uid}})
const seedMemory = (uid, overrides = {}) =>
  db.doc(memoryPath(uid)).set({ownerId:uid,consentState:'authorized',deleted:false,...overrides})
const seedMovie = (uid, overrides = {}) =>
  db.doc(moviePath(uid)).set({id:'movie-1',ownerId:uid,consentState:'authorized',status:'draft',version:1,...overrides})
const readMovie = async uid => db.doc(moviePath(uid)).get()
const audits = async uid => (await auditCollection(uid).get()).docs.map(s => s.data())
const bounded = async (promise, name) => {
  let timer
  try {
    return await Promise.race([promise,new Promise((_,reject) => {
      timer = setTimeout(() => reject(Error('R525 timeout waiting for ' + name)), 15000)
    })])
  } finally { clearTimeout(timer) }
}
async function denied(promise, name) {
  await assert.rejects(promise, err => {
    assert.equal(err.code, 'failed-precondition', name + ': requires failed-precondition')
    return true
  })
}
function check(name, run) {
  test(name, {timeout:30000}, async () => {
    await run()
    console.log('R525_REAL_FIRESTORE_CASE_PASS ' + name)
  })
}
check('explicit authorized owner creates audited draft in real Firestore', async () => {
  const uid = uidFor('authorized')
  await seedMemory(uid)
  const result = await original.upsertLifeMovieManifest.run(request(), identity(uid))
  assert.equal(result.chapterCount,1)
  const stored = await readMovie(uid)
  assert.equal(stored.get('consentState'),'authorized')
  assert.equal(stored.get('ownerId'),uid)
  const ledger = await audits(uid)
  assert.equal(ledger.length,1)
  assert.equal(ledger[0].kind,'life_movie.manifest_upserted')
})
check('missing, denied, pending and revoked memory consent cannot create movies', async () => {
  for (const state of ['missing','denied','pending','revoked']) {
    const uid = uidFor('consent-' + state)
    await seedMemory(uid, state === 'missing' ? {} : {consentState:state})
    if(state === 'missing') await db.doc(memoryPath(uid)).update({consentState:admin.firestore.FieldValue.delete()})
    await denied(original.upsertLifeMovieManifest.run(request(), identity(uid)),state)
    assert.equal((await readMovie(uid)).exists,false)
    assert.equal((await audits(uid)).length,0)
  }
})
check('withdrawal before the real transaction memory read blocks a stale draft', async () => {
  const uid = uidFor('raced-source')
  await seedMemory(uid)
  const gate = holdBefore(memoryPath(uid))
  const delayed = callableAdapter({hold:gate})
  const outcome = delayed.upsertLifeMovieManifest.run(request(),identity(uid))
  await bounded(gate.reached.promise,'memory read preflight')
  try {
    await db.doc(memoryPath(uid)).update({consentState:'revoked'})
  } finally { gate.release.resolve() }
  await denied(bounded(outcome,'raced upsert completion'),'raced withdrawal')
  assert.equal((await readMovie(uid)).exists,false)
  assert.equal((await audits(uid)).length,0)
})
check('completed revoked movie ID cannot be silently re-authorized', async () => {
  const uid = uidFor('tombstone')
  await seedMemory(uid)
  await seedMovie(uid,{consentState:'revoked',status:'draft'})
  await denied(original.upsertLifeMovieManifest.run(request(),identity(uid)),'tombstone')
  assert.equal((await readMovie(uid)).get('consentState'),'revoked')
  assert.equal((await audits(uid)).length,0)
})
check('revoke winning before movie read prevents concurrent upsert', async () => {
  const uid = uidFor('raced-movie')
  await seedMemory(uid)
  await seedMovie(uid)
  const gate = holdBefore(moviePath(uid))
  const delayed = callableAdapter({hold:gate})
  const outcome = delayed.upsertLifeMovieManifest.run(request(),identity(uid))
  await bounded(gate.reached.promise,'movie read preflight')
  try {
    const revoked = await original.revokeLifeMovieManifest.run({movieId:'movie-1'},identity(uid))
    assert.equal(revoked.revoked,true)
  } finally { gate.release.resolve() }
  await denied(bounded(outcome,'movie upsert completion'),'raced tombstone')
  assert.equal((await readMovie(uid)).get('consentState'),'revoked')
  assert.equal((await audits(uid)).length,1)
})
async function seedReady(uid) {
  await seedMemory(uid,{
    lifeMovie:{sceneTruthPacketId:'scene-1',personModelBundleIds:['bundle-1']},
  })
  await db.doc(scenePath(uid)).set({
    ownerId:uid,schemaVersion:'urai-life-model-v1',state:'current',
    syntheticOutputMayBecomeHistoricalSource:false,decision:'READY',dependencyIds:[],
  })
  await db.doc(bundlePath(uid)).set({
    ownerId:uid,schemaVersion:'urai-life-model-v1',state:'current',
    synthetic:false,dependencyIds:[],
  })
}
check('READY path reads genuine SceneTruth and person model evidence', async () => {
  const uid = uidFor('ready')
  await seedReady(uid)
  const result=await original.upsertLifeMovieManifest.run(request('ready'),identity(uid))
  assert.equal(result.status,'ready')
  const saved=await readMovie(uid)
  assert.equal(saved.get('status'),'ready')
  assert.ok(saved.get('dependencyIds').includes('scene-1'))
  assert.ok(saved.get('dependencyIds').includes('bundle-1'))
  assert.equal((await audits(uid)).length,1)
})
check('SceneTruth withdrawn before transaction dependency read denies READY', async () => {
  const uid = uidFor('raced-scene')
  await seedReady(uid)
  const gate=holdBefore(scenePath(uid))
  const delayed=callableAdapter({hold:gate})
  const outcome=delayed.upsertLifeMovieManifest.run(request('ready'),identity(uid))
  await bounded(gate.reached.promise,'scene evidence read')
  try {
    await db.doc(scenePath(uid)).update({state:'revoked'})
  } finally {gate.release.resolve()}
  await denied(bounded(outcome,'raced READY completion'),'raced scene')
  assert.equal((await readMovie(uid)).exists,false)
  assert.equal((await audits(uid)).length,0)
})
check('injected audit failure rolls back real revocation transaction', async () => {
  const uid=uidFor('atomic-audit')
  await seedMovie(uid,{status:'ready'})
  const injected=callableAdapter({failAudit:true})
  await assert.rejects(
    injected.revokeLifeMovieManifest.run({movieId:'movie-1'},identity(uid)),
    /R525_SYNTHETIC_AUDIT_FAILURE/,
  )
  assert.equal((await readMovie(uid)).get('consentState'),'authorized')
  assert.equal((await readMovie(uid)).get('status'),'ready')
  assert.equal((await audits(uid)).length,0)
})
check('successful real revocation atomically stores tombstone and audit', async () => {
  const uid=uidFor('revoked-audit')
  await seedMovie(uid,{status:'ready'})
  const result=await original.revokeLifeMovieManifest.run({movieId:'movie-1'},identity(uid))
  assert.deepEqual(result,{movieId:'movie-1',revoked:true})
  const snap=await readMovie(uid)
  assert.equal(snap.get('consentState'),'revoked')
  assert.equal(snap.get('status'),'draft')
  const ledger=await audits(uid)
  assert.equal(ledger.length,1)
  assert.equal(ledger[0].kind,'life_movie.manifest_revoked')
})
after(async () => {
  await db.terminate()
  await app.delete()
})
