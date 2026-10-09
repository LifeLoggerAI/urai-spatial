'use strict'
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const admin = require('firebase-admin')
const project = 'demo-memory-media-playback'
for (const [key, value] of Object.entries({ GCLOUD_PROJECT: project, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9549',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8249', STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9249' })) {
  assert.equal(process.env[key], value, `Only isolated ${key} is authorized`)
}
admin.initializeApp({ projectId: project, storageBucket: `${project}.appspot.com` })
const db = admin.firestore(), sha = value => crypto.createHash('sha256').update(value).digest('hex')
const base = `http://127.0.0.1:5549/${project}/us-central1`, cases = []
async function signup() {
  const response = await fetch('http://127.0.0.1:9549/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fictional-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }), signal: AbortSignal.timeout(10000) })
  assert.equal(response.status, 200); const value = await response.json()
  assert.ok(value.localId && value.idToken); return value
}
async function call(name, data, token) {
  const response = await fetch(`${base}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }), signal: AbortSignal.timeout(30000) })
  const body = await response.json(); return { response, body }
}
function denied(result, status, label) {
  assert.equal(result.body.error?.status, status, label); assert.ok(result.response.status >= 400, label); cases.push(label)
}
async function main() {
  const owner = await signup(), foreign = await signup(), uid = owner.localId
  const memoryId = 'fictional-native-memory', userPath = `users/${uid}`, memoryPath = `${userPath}/memories/${memoryId}`
  const sourceReceiptRef = 'psr_fictional_native_capture_000001', sourceReceiptPath = `uraiPrivateSourceReceipts/${sha(sourceReceiptRef)}`
  const policyPath = `${userPath}/privacyPolicy/current`, consentPath = `consentRecords/${uid}_memory_storage`
  const modes = { mode: 'granted', retentionDays: 365, precise: false, replayVisible: true, lifeMapVisible: true,
    modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false }
  const policy = { version: 2, revision: 4, ownerId: uid,
    domains: Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(name => [name, { ...modes }])),
    enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' } }
  const consent = { uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted',
    receiptHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 3_600_000).toISOString() }
  // Fictional header-recognizable bytes test storage fixity, never movie quality.
  const bytes = Buffer.alloc(131072); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251; bytes.write('ftyp', 4)
  let receipt, proof, bucketPrivacyMetadataUnavailable = false
  try {
    const batch = db.batch(); batch.set(db.doc(userPath), { accountStatus: 'active' }); batch.set(db.doc(memoryPath), { ownerId: uid, privacy: 'private', sourceMedia: [] })
    batch.set(db.doc(policyPath), policy); batch.set(db.doc(consentPath), consent); await batch.commit()
    denied(await call('getMemoryMediaPlaybackAuthority', { memoryId, receiptId: 'c'.repeat(64) }), 'UNAUTHENTICATED', 'anonymous callable')
    const unsigned = await fetch(`${base}/streamMemoryMediaPlayback`, { signal: AbortSignal.timeout(10000) })
    assert.equal(unsigned.status, 401); assert.deepEqual(await unsigned.json(), { error: 'memory_media_playback_unavailable' }); cases.push('anonymous actual stream')
    const uploaded = await call('registerMemoryMedia', { memoryId, operationId: 'fictional-native-upload', kind: 'video', contentType: 'video/mp4', base64: bytes.toString('base64') }, owner.idToken)
    assert.equal(uploaded.response.status, 200); assert.equal(uploaded.body.result?.state, 'ready')
    const receiptId = uploaded.body.result.receiptId, receiptRef = db.doc(`${userPath}/memoryMediaReceipts/${receiptId}`)
    receipt = (await receiptRef.get()).data(); assert.equal(receipt.state, 'ready'); assert.equal(receipt.sha256, sha(bytes))
    assert.ok(new RegExp(`^${project}\\.(?:appspot\\.com|firebasestorage\\.app)$`).test(receipt.bucketName), 'source Storage bucket must remain isolated demo')
    const memory = (await db.doc(memoryPath).get()).data(); assert.deepEqual(memory.sourceMedia, [{ kind: 'video', mediaReceiptId: receiptId }])
    const bucket = admin.storage().bucket(receipt.bucketName), file = bucket.file(receipt.objectPath, { generation: receipt.storageGeneration })
    const [metadata] = await file.getMetadata(), [storedBytes] = await file.download()
    assert.equal(metadata.generation, receipt.storageGeneration); assert.equal(metadata.metadata.ownerHash, sha(uid))
    assert.equal(metadata.metadata.memoryHash, sha(memoryId)); assert.equal(sha(storedBytes), receipt.sha256); assert.deepEqual(storedBytes, bytes)
    cases.push('actual receipt-only upload and exact stored generation bytes')
    // These isolated catalog rows are deliberately fictional approval-shaped
    // fixtures. They test the loaded entry's selected-memory authority; they
    // do not certify a source, place, reconstruction or private runtime bytes.
    const assetId = 'crp_fictional_native_001', consents = ['memory.storage', 'location.context'].map(purpose => ({ purpose,
      policyVersion: 'fictional-v1', decisionReceiptId: `fictional-${purpose}` }))
    const sourceBinding = { sourceReceiptRef, sourceRevision: 1, sourceSha256: sha(bytes), sourceByteLength: bytes.length,
      sourceFixityRef: 'private:fictional-native/fixity', sourceConsentSha256: sha(JSON.stringify(consents)) }
    const capturedBatch = db.batch()
    capturedBatch.set(db.doc(`${userPath}/privacyRuntime/location-collection`), { enabled: true })
    capturedBatch.set(db.doc(`${userPath}/capturedRealityReplayBindings/${memoryId}`), { ownerId: uid, memoryId, state: 'accepted',
      capturedRealityAssetId: assetId, placeEntityId: 'fictional-native-place' })
    capturedBatch.set(db.doc(`${userPath}/capturedRealityAssets/${assetId}`), { ownerId: uid, state: 'ready', reviewState: 'accepted',
      releaseState: 'private-pilot', truthClass: 'spatially-reconstructable', browserCertified: true, mobileCertified: true,
      anchorEntityId: 'fictional-native-place', truthLabel: 'Fictional authority fixture; no world acceptance',
      storageBucket: `${project}.appspot.com`, runtimeObject: `private-captured-reality/${uid}/${assetId}/runtime/${'d'.repeat(64)}.splat`,
      runtimeSha256: 'd'.repeat(64), runtimeBytes: 32, reviewApprovedRuntimeSha256: 'd'.repeat(64), reviewApprovedStorageGeneration: '123',
      sourceManifestSha256: 'e'.repeat(64), reviewApprovedSourceManifestSha256: 'e'.repeat(64), sourceBindings: [sourceBinding] })
    capturedBatch.set(db.doc(sourceReceiptPath), { ...sourceBinding, schemaVersion: 'urai-private-source-receipt-v2', ownerUid: uid,
      status: 'ACTIVE', synthetic: false, purposes: ['reconstruct-place'], consents })
    await capturedBatch.commit()
    const capturedEntry = () => call('getCapturedRealityReplayEntry', { memoryId, deviceTier: 'desktop' }, owner.idToken)
    denied(await call('getCapturedRealityReplayEntry', { memoryId, deviceTier: 'desktop' }), 'UNAUTHENTICATED', 'anonymous loaded captured entry')
    const entry = await capturedEntry(); assert.equal(entry.response.status, 200); assert.equal(entry.body.result?.available, true)
    assert.equal(entry.body.result.assetId, assetId); assert.doesNotMatch(JSON.stringify(entry.body.result), /private-captured-reality|storageBucket|sourceReceiptRef|fictional-native-place/)
    cases.push('loaded captured entry retains valid fictional memory identity without private locators')
    await db.doc(memoryPath).delete(); denied(await capturedEntry(), 'PERMISSION_DENIED', 'loaded captured entry rejects missing memory'); await db.doc(memoryPath).set(memory)
    for (const [label, fields] of [
      ['deleted', { deleted: true }], ['hidden', { privacy: 'hidden' }], ['foreign', { ownerId: foreign.localId }],
      ['revoked', { consentState: 'revoked' }], ['pending', { consentState: 'pending' }],
    ]) {
      await db.doc(memoryPath).update(fields); denied(await capturedEntry(), 'PERMISSION_DENIED', `loaded captured entry rejects ${label} selected memory`)
      await db.doc(memoryPath).set(memory)
    }
    await db.doc(policyPath).update({ 'domains.memory.replayVisible': false })
    denied(await capturedEntry(), 'PERMISSION_DENIED', 'loaded captured entry rejects disabled Replay visibility'); await db.doc(policyPath).set(policy)
    // Firebase Storage's emulated GCS API does not attest bucket IAM, UBLA or
    // public-access prevention. This proof never changes that production gate.
    try {
      const [bucketMetadata] = await bucket.getMetadata()
      bucketPrivacyMetadataUnavailable = bucketMetadata.iamConfiguration?.uniformBucketLevelAccess?.enabled !== true
        || bucketMetadata.iamConfiguration?.publicAccessPrevention !== 'enforced'
    } catch (error) {
      assert.equal(Number(error.code), 404, 'only the known emulator bucket metadata limitation is expected'); bucketPrivacyMetadataUnavailable = true
    }
    assert.equal(bucketPrivacyMetadataUnavailable, true, 'the emulator cannot supply a verified private production bucket')
    const selection = { memoryId, receiptId }, authority = () => call('getMemoryMediaPlaybackAuthority', selection, owner.idToken)
    const unsupportedBucket = await authority()
    assert.ok(['INTERNAL', 'FAILED_PRECONDITION'].includes(unsupportedBucket.body.error?.status)); assert.equal(unsupportedBucket.body.result, undefined)
    cases.push('descriptor stays closed without verifiable bucket privacy')
    denied(await call('getMemoryMediaPlaybackAuthority', selection, foreign.idToken), 'FAILED_PRECONDITION', 'foreign current owner')
    await db.doc(consentPath).update({ status: 'revoked' }); denied(await authority(), 'FAILED_PRECONDITION', 'current C1 withdrawal'); await db.doc(consentPath).set(consent)
    await db.doc(policyPath).update({ 'domains.memory.mode': 'denied' }); denied(await authority(), 'FAILED_PRECONDITION', 'current memory policy withdrawal'); await db.doc(policyPath).set(policy)
    await db.doc(policyPath).update({ 'domains.memory.replayVisible': false }); denied(await authority(), 'FAILED_PRECONDITION', 'current Replay visibility disabled'); await db.doc(policyPath).set(policy)
    await db.doc(memoryPath).update({ sourceMedia: [] }); denied(await authority(), 'FAILED_PRECONDITION', 'receipt attachment removed'); await db.doc(memoryPath).update({ sourceMedia: memory.sourceMedia })
    await db.doc(`privacyDeletionTombstones/${uid}`).set({ uid, active: false, deletionPlanningLeaseToken: 'fictional-native-plan' })
    denied(await authority(), 'FAILED_PRECONDITION', 'deletion planning lease'); await db.doc(`privacyDeletionTombstones/${uid}`).delete()
    await db.doc(`${userPath}/privacyRuntime/exportAuthority`).set({ generation: 0, pendingDeletions: { fictional: true } })
    denied(await authority(), 'FAILED_PRECONDITION', 'current pending deletion'); await db.doc(`${userPath}/privacyRuntime/exportAuthority`).delete()
    await admin.auth().updateUser(uid, { disabled: true }); denied(await authority(), 'UNAUTHENTICATED', 'disabled current Auth account'); await admin.auth().updateUser(uid, { disabled: false })
    await new Promise(resolve => setTimeout(resolve, 1100)); await admin.auth().revokeRefreshTokens(uid)
    denied(await authority(), 'UNAUTHENTICATED', 'revoked real emulator token')
    proof = { proof: 'PASS', project, sourceCommit: process.env.URAI_EXACT_HEAD || null,
      actualFunctionsLoaded: true, actualAuthLoaded: true, actualFirestoreLoaded: true, actualStorageLoaded: true,
      actualReceiptAndStoredByteBinding: true, bucketPrivacyMetadataUnavailable, nativePositivePlaybackAccepted: false,
      actualCapturedEntryMemoryAuthority: true, capturedAuthorityCatalogFixturesOnly: true, capturedPrivateRuntimeAccepted: false,
      rangeAndMidStreamEvidence: 'separate actual compiled handlers and real Node HTTP fixtures', cases: cases.length, passedCases: cases,
      syntheticFixture: true, visualOrMovieAcceptance: false, providerOrDeployedAcceptance: false, noProductionOrPrivateFamilyData: true }
  } finally {
    if (receipt) await admin.storage().bucket(receipt.bucketName).file(receipt.objectPath).delete({ ignoreNotFound: true })
    await db.recursiveDelete(db.doc(userPath)); await db.doc(consentPath).delete(); await db.doc(sourceReceiptPath).delete(); await db.doc(`privacyDeletionTombstones/${uid}`).delete()
    await admin.auth().deleteUser(uid); await admin.auth().deleteUser(foreign.localId); await db.terminate(); await admin.app().delete()
  }
  console.log(JSON.stringify(proof))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
