// Build Functions first, then run from repository root:
// firebase emulators:exec --project demo-urai-export-transfer --config firebase.export-review.json --only auth,firestore,storage,functions "node urai-tier1/tests/export-transfer.emulator.mjs"
// Synthetic authority fixtures only: this does not prove hosted consent issuance.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, terminate } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import admin from 'firebase-admin'

const projectId = 'demo-urai-export-transfer'
assert.equal(process.env.GCLOUD_PROJECT, projectId)
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:18082')
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:19097')
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:19199')
const app = initializeApp({ projectId, apiKey: 'synthetic-only' }, 'export-transfer')
const auth = getAuth(app), db = getFirestore(app), functions = getFunctions(app)
connectAuthEmulator(auth, 'http://127.0.0.1:19097', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 18082)
connectFunctionsEmulator(functions, '127.0.0.1', 15002)
const adm = admin.initializeApp({ projectId, storageBucket: `${projectId}.appspot.com` }, 'export-transfer-admin')
const server = adm.firestore(), checks = []
const call = (name, data) => httpsCallable(functions, name)(data).then(r => r.data)
try {
  const user = (await createUserWithEmailAndPassword(auth, `export-${Date.now()}@example.test`, 'Synthetic-only-123!')).user
  const uid = user.uid, root = server.doc(`users/${uid}`)
  await setDoc(doc(db, 'users', uid), { uid })
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 600000), receiptHash = 'c'.repeat(64)
  const grant = server.doc(`consentRecords/${uid}_data_export`)
  await grant.set({ uid, purpose: 'data.export', consentTier: 'C7', policyVersion: '1.0.0', status: 'granted', receiptHash, expiresAt })
  await server.doc(`privacyDeletionTombstones/${uid}`).set({ uid, exportConsentStatus: 'granted', exportConsentReceiptHash: receiptHash, exportConsentPolicyVersion: '1.0.0', exportConsentExpiresAt: expiresAt })
  const domains = Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(domain => [domain, {
    mode: 'granted', retentionDays: 365, precise: false, replayVisible: true, lifeMapVisible: true,
    modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false,
  }]))
  await root.collection('privacyPolicy').doc('current').set({ version: 2, ownerId: uid, revision: 4, domains, enforcement: { state: 'fully-enforced', providerState: 'complete', jobId: null, affectedTargets: [] } })
  async function prepare(label, size) {
    await root.set({ syntheticPayload: 's'.repeat(size) }, { merge: true })
    const created = await call('createExportRequest', { operationId: `synthetic-${label}-${Date.now()}`, scopes: ['profile'] })
    const job = root.collection('exportJobs').doc(created.jobId)
    const deadline = Date.now() + 45000
    let snapshot
    do {
      snapshot = await job.get()
      if (snapshot.get('state') === 'ready') break
      assert.notEqual(snapshot.get('state'), 'failed', JSON.stringify(snapshot.data()))
      await new Promise(resolve => setTimeout(resolve, 200))
    } while (Date.now() < deadline)
    assert.equal(snapshot.get('state'), 'ready', 'real trigger must publish the export')
    const descriptor = await call('getOperationalExportDownloadUrl', { jobId: created.jobId })
    const url = new URL(descriptor.url)
    assert.equal(url.origin, 'http://127.0.0.1:15002')
    assert.equal(url.pathname, `/${projectId}/us-central1/downloadOperationalExportPackage`)
    return { descriptor, snapshot }
  }
  const headers = { Authorization: `Bearer ${await user.getIdToken()}` }
  const small = await prepare('complete', 1024)
  const success = await fetch(small.descriptor.url, { headers })
  assert.equal(success.status, 200)
  const bytes = Buffer.from(await success.arrayBuffer())
  assert.equal(createHash('sha256').update(bytes).digest('hex'), small.snapshot.get('checksum'))
  assert.equal(bytes.length, small.snapshot.get('exportBytes'))
  assert.equal(JSON.parse(bytes).data.profile.uid, uid)
  checks.push('real-request-worker-storage-authenticated-download-checksum')
  assert.equal((await fetch(small.descriptor.url)).status, 401)
  checks.push('anonymous-download-denied')
  const large = await prepare('withdraw', 800 * 1024)
  const transferTimeout = AbortSignal.timeout(15000)
  const transfer = await fetch(large.descriptor.url, { headers, signal: transferTimeout })
  assert.equal(transfer.status, 200)
  const reader = transfer.body.getReader()
  const first = await reader.read()
  assert.equal(first.done, false)
  let received = first.value.length, interrupted = false
  // Commit canonical withdrawal while the real HTTP stream is active.
  await grant.update({ status: 'revoked' })
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      received += next.value.length
    }
  } catch { interrupted = true }
  assert.equal(interrupted, true, 'withdrawn transfer must not finish successfully')
  assert.ok(received > 0 && received < large.snapshot.get('exportBytes'), 'transfer must remain incomplete')
  assert.equal((await fetch(large.descriptor.url, { headers })).status, 409)
  await assert.rejects(call('getOperationalExportDownloadUrl', { jobId: large.snapshot.id }), e => e.code === 'functions/failed-precondition')
  checks.push('canonical-withdrawal-leaves-transfer-incomplete-and-denies-reuse')
  // Firebase's local proxy can retain a destroyed upstream socket. A timeout
  // proves only an incomplete transfer during this window, not remote closure.
  const transferTermination = transferTimeout.aborted ? 'client-timeout-emulator-proxy' : 'remote-stream-error'
  console.log('EXPORT_NATIVE_EMULATOR_PASS ' + JSON.stringify({ projectId, checks, transferTermination, receivedBeforeStop: received, totalBytes: large.snapshot.get('exportBytes'), synthetic: true, productionMutation: false }))
} finally {
  await terminate(db); await deleteApp(app); await adm.delete()
}
