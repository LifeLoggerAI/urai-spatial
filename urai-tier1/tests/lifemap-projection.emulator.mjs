// From repository root after the Functions build:
// node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-urai-lifemap-projection --config firebase.lifemap-review.json --only auth,firestore,functions "node urai-tier1/tests/lifemap-projection.emulator.mjs"
// Run only with synthetic data; hard-coded project and loopback assertions below reject hosted use.
import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDocs, collection, terminate } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import admin from 'firebase-admin'

const projectId = 'demo-urai-lifemap-projection'
assert.equal(process.env.GCLOUD_PROJECT, projectId)
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:18081')
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:19098')
const app = initializeApp({ projectId, apiKey: 'synthetic-only' }, 'lifemap-projection')
const auth = getAuth(app), db = getFirestore(app), functions = getFunctions(app)
connectAuthEmulator(auth, 'http://127.0.0.1:19098', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 18081)
connectFunctionsEmulator(functions, '127.0.0.1', 15001)
const adm = admin.initializeApp({ projectId }, 'lifemap-projection-admin'), server = adm.firestore()
const read = () => httpsCallable(functions, 'getPassportSnapshot')({ view: 'life-map' }).then(result => result.data)
let uid
const checks = []
try {
  const user = (await createUserWithEmailAndPassword(auth, `lifemap-${Date.now()}@example.test`, 'Synthetic-only-123!')).user
  uid = user.uid
  await setDoc(doc(db, 'users', uid), { uid })
  assert.equal((await read()).state, 'denied'); checks.push('no-consent-denied')
  const grant = server.doc(`consentRecords/${uid}_memory_storage`)
  const policy = server.doc(`users/${uid}/privacyPolicy/current`)
  const applied = server.doc(`users/${uid}/privacyRuntime/life-map-visibility`)
  await grant.set({ uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted', receiptHash: 'a'.repeat(64), expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 600000) })
  await policy.set({ ownerId: uid, version: 2, revision: 1, domains: { memory: { mode: 'granted', lifeMapVisible: true } }, enforcement: { state: 'fully-enforced', jobId: 'synthetic-job', affectedTargets: ['life-map-visibility'] } })
  await applied.set({ ownerId: uid, domain: 'memory', target: 'life-map-visibility', revision: 1, sourceJobId: 'synthetic-job', mode: 'granted', enabled: true, lifeMapVisible: true })
  let result = await read()
  assert.equal(result.state, 'available'); assert.equal(result.events.length, 0); checks.push('authorized-empty')
  await server.doc(`users/${uid}/lifeMapEvents/seed-only`).set({ userId: uid, title: 'Not a canonical memory' })
  await assert.rejects(getDocs(collection(db, 'users', uid, 'lifeMapEvents')), error => error.code === 'permission-denied')
  assert.equal((await read()).events.length, 0); checks.push('seed-only-source-excluded')
  const memory = server.doc(`users/${uid}/memories/synthetic-canonical`)
  await memory.set({ ownerId: uid, demo: false, deleted: false, consentState: 'authorized', title: 'Synthetic canonical memory', summary: 'Native emulator fixture', occurredAt: admin.firestore.Timestamp.now(), privateMediaUrl: 'must-never-leave-server', replayManifest: { id: 'synthetic-manifest' } })
  result = await read()
  assert.equal(result.events.length, 1); assert.equal(result.events[0].id, 'synthetic-canonical')
  assert.equal(result.events[0].replayAvailable, false); assert.equal(JSON.stringify(result).includes('must-never-leave-server'), false)
  assert.ok(result.validUntil > result.issuedAt && result.validUntil - result.issuedAt <= 30000); checks.push('canonical-owner-read')
  await grant.update({ status: 'revoked' }); result = await read()
  assert.equal(result.state, 'denied'); assert.equal(result.events.length, 0); checks.push('canonical-withdrawal')
  await grant.update({ status: 'granted' })
  await applied.update({ lifeMapVisible: false }); assert.equal((await read()).state, 'denied'); checks.push('visibility-withdrawal')
  await applied.update({ lifeMapVisible: true })
  await memory.update({ privacyLevel: 'hidden' }); assert.equal((await read()).events.length, 0); checks.push('hidden-memory')
  await server.doc(`privacyDeletionTombstones/${uid}`).set({ uid, active: true })
  await assert.rejects(read(), error => error.code === 'functions/permission-denied'); checks.push('deletion-fence')
  await signOut(auth)
  await assert.rejects(read(), error => error.code === 'functions/unauthenticated'); checks.push('signed-out')
  console.log('LIFE_MAP_NATIVE_EMULATOR_PASS ' + JSON.stringify({ projectId, checks, synthetic: true, productionMutation: false }))
} finally {
  // Only the disposable demo-project records exist; no hosted data is addressed.
  await terminate(db); await deleteApp(app); await adm.delete()
}
