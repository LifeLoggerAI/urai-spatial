/**
 * R550: actual Spatial callable -> owner-only Firestore -> Tier-1 parser ->
 * immutable revocation. Synthetic review-only project; no private MP4 or C6.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, setDoc } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import {
  parseLifeMovieRuntimeManifest, liveLifeMovieManifestAuthority,
  lifeMovieReplayHref, scopedLifeMovieClientMemory,
} from '../src/spatial/life-movie/lifeMovieRuntimeContract.ts'

const adminRequire = createRequire(new URL('../../apps/functions/package.json', import.meta.url))
const { initializeApp: initAdmin, deleteApp: deleteAdmin } = adminRequire('firebase-admin/app')
const { getFirestore: getAdminDb } = adminRequire('firebase-admin/firestore')
const PROJECT = 'urai-spatial-manifest-review-test'
const MOVIE = 'movie-r550'
const MEMORY = 'memory-r550'

function requireDisposableEmulators() {
  assert.equal(process.env.GCLOUD_PROJECT, PROJECT, 'fixed disposable project required')
  for (const [key, port] of [
    ['FIREBASE_AUTH_EMULATOR_HOST', 9099],
    ['FIRESTORE_EMULATOR_HOST', 8080],
    ['FIREBASE_FUNCTIONS_EMULATOR_HOST', 5001],
  ]) assert.match(String(process.env[key] ?? ''), new RegExp('^(?:127\\.0\\.0\\.1|localhost):' + port + '$'), key)
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined)
}
function syntheticClient(name) {
  const app = initializeApp({ projectId: PROJECT, apiKey: 'synthetic-review-only',
    authDomain: 'localhost', appId: '1:1:web:synthetic-r550' }, 'r550-' + name)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const firestore = getFirestore(app)
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  const functions = getFunctions(app, 'us-central1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  return { app, auth, firestore, functions }
}
test('owner-created manifest is parsable and terminally revoked through original Functions', { timeout: 120000 }, async () => {
  requireDisposableEmulators()
  const admin = initAdmin({ projectId: PROJECT }, 'r550-admin')
  const owner = syntheticClient('owner')
  const foreign = syntheticClient('foreign')
  try {
    const random = randomUUID().slice(0, 10)
    const { user } = await createUserWithEmailAndPassword(owner.auth,
      'owner-' + random + '@example.test', 'R550-Synthetic-Owner-Pass123!')
    const uid = user.uid
    const db = getAdminDb(admin)
    await db.doc('users/' + uid + '/memories/' + MEMORY).set({
      ownerId: uid, deleted: false, privacy: 'private', consentState: 'authorized',
      truthClass: 'RECORDED_SOURCE_TRUTH', confidence: 0.92,
      lifeMovie: { cinematicAssetId: 'synthetic-asset-r550',
        replayEntry: '/replay?memoryId=' + MEMORY,
        provenance: { sourceIds: ['synthetic-source-r550'] } },
    })
    const upsert = httpsCallable(owner.functions, 'upsertLifeMovieManifest')
    const revoke = httpsCallable(owner.functions, 'revokeLifeMovieManifest')
    const request = { movieId: MOVIE, status: 'draft', chapters: [{
      id: 'chapter-r550', memoryId: MEMORY, order: 0,
      truthClass: 'UNKNOWN_UNRESOLVED', replayEntry: 'https://outside.example/unsafe',
    }] }
    assert.deepEqual((await upsert(request)).data, { movieId: MOVIE, status: 'draft', chapterCount: 1 })
    const path = 'users/' + uid + '/lifeMovies/' + MOVIE
    const ref = doc(owner.firestore, path)
    const snap = await getDocFromServer(ref)
    assert.equal(snap.exists(), true)
    assert.equal(liveLifeMovieManifestAuthority(snap.metadata, true), true)
    assert.equal(snap.data().consentState, 'authorized')
    assert.equal(snap.data().chapters[0].truthClass, 'RECORDED_SOURCE_TRUTH')
    assert.equal(snap.data().chapters[0].replayEntry, '/replay?memoryId=' + MEMORY)
    const parsed = parseLifeMovieRuntimeManifest(snap.data(), uid)
    assert.equal(parsed.status, 'ready')
    assert.equal(parsed.manifest.chapters[0].confidence, 0.92)
    assert.match(lifeMovieReplayHref(parsed.manifest.chapters[0]), /^\/replay\?memoryId=/)
    const selected = { id: MEMORY, ownerId: uid, authorization: 'owner',
      deleted: false, privacy: 'private', demo: false }
    assert.equal(scopedLifeMovieClientMemory(selected, uid, MOVIE, parsed), selected)
    assert.equal(scopedLifeMovieClientMemory(selected, uid, 'foreign-movie', parsed), null)
    assert.equal(parseLifeMovieRuntimeManifest(snap.data(), 'foreign-owner').status, 'unauthorized')
    const foreignUid = (await createUserWithEmailAndPassword(foreign.auth,
      'foreign-' + random + '@example.test', 'R550-Synthetic-Foreign-Pass123!')).user.uid
    assert.notEqual(foreignUid, uid)
    await assert.rejects(getDocFromServer(doc(foreign.firestore, path)),
      error => error?.code === 'permission-denied')
    await assert.rejects(setDoc(ref, { ownerId: uid, consentState: 'authorized' }),
      error => error?.code === 'permission-denied')
    // READY cannot be set without current SceneTruth authority.
    await assert.rejects(upsert({ movieId: 'movie-r550-unverified-ready', status: 'ready',
      chapters: [{ id: 'chapter-r550', memoryId: MEMORY, order: 0 }] }))
    assert.equal((await db.doc('users/' + uid + '/lifeMovies/movie-r550-unverified-ready').get()).exists, false)
    assert.equal((await revoke({ movieId: MOVIE })).data.revoked, true)
    const revoked = (await getDocFromServer(ref)).data()
    assert.equal(revoked.consentState, 'revoked')
    const denied = parseLifeMovieRuntimeManifest(revoked, uid)
    assert.equal(denied.status, 'unauthorized')
    assert.equal(scopedLifeMovieClientMemory(selected, uid, MOVIE, denied), null)
    await assert.rejects(upsert(request))
    await db.doc('users/' + uid + '/memories/' + MEMORY).update({ consentState: 'revoked' })
    await assert.rejects(upsert({ ...request, movieId: 'movie-r550-reused-source' }))
    assert.equal((await db.doc('users/' + uid + '/lifeMovies/movie-r550-reused-source').get()).exists, false)
    const audit = await db.collection('users/' + uid + '/privacyAudit').get()
    assert.deepEqual(audit.docs.map(x => x.get('kind')).sort(),
      ['life_movie.manifest_revoked', 'life_movie.manifest_upserted'])
    console.log('R550_REAL_SPATIAL_CALLABLE_REPLAY_PASS', JSON.stringify({
      projectId: PROJECT, ownerRead: true, foreignReadDenied: true,
      clientWriteDenied: true, trustFromServerMemory: true, consentRevoked: true,
      productionC6Issued: false, mp4Rendered: false, productionAuthorized: false,
    }))
  } finally {
    await Promise.allSettled([deleteApp(owner.app), deleteApp(foreign.app), deleteAdmin(admin)])
  }
})
