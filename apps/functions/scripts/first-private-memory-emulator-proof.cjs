'use strict'
// Synthetic-only real Firebase emulator proof; no production or private family data.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const admin = require('firebase-admin')
// Share the existing isolated browser-journey emulator project and its Auth/Firestore ports.
const PROJECT = 'demo-urai-auth-journey'
const AUTH = '127.0.0.1:9099'
const FUNCTIONS = 'http://127.0.0.1:5001/' + PROJECT + '/us-central1'
assert.equal(process.env.GCLOUD_PROJECT, PROJECT, 'Only the fictional test project is permitted')
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080', 'Actual local Firestore required')
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, AUTH, 'Actual local Auth required')
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199', 'Actual local Storage required')
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined, 'No cloud credentials')
const app = admin.initializeApp({ projectId: PROJECT, storageBucket: PROJECT + '.firebasestorage.app' })
const db = admin.firestore(app)
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const cases = []
const pathFor = (uid, id) => 'users/' + uid + '/memories/' + id
async function signup(label) {
  const response = await fetch('http://' + AUTH + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fictional-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: label + '-' + crypto.randomBytes(8).toString('hex') + '@example.invalid',
      password: 'Fictional_Emulator_Only_2026!', returnSecureToken: true }), signal: AbortSignal.timeout(15000),
  })
  const data = await response.json()
  assert.equal(response.status, 200, JSON.stringify(data))
  assert.ok(data.localId && data.idToken)
  return data
}
function policy(uid) {
  const domain = { mode: 'granted', retentionDays: 365, precise: false, replayVisible: false,
    lifeMapVisible: false, modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false }
  return { version: 2, revision: 4, ownerId: uid,
    domains: Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(k => [k, { ...domain }])),
    enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' } }
}
async function seed(uid) {
  await db.doc('users/' + uid).set({ deleted: false, accountStatus: 'active' })
  await db.doc('users/' + uid + '/privacyPolicy/current').set(policy(uid))
  await db.doc('consentRecords/' + uid + '_memory_storage').set({ uid, purpose: 'memory.storage',
    consentTier: 'C1', policyVersion: '1.0.0', status: 'granted',
    receiptHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 3600000).toISOString() })
}
function packet(uid, id, media) {
  const originalSha256 = 'c'.repeat(64), derivativeSha256 = media ? sha(media) : 'b'.repeat(64)
  const derivativeLength = media ? media.length : 112
  const provenance = { originalSourceRef: 'offline:fictional-' + id, originalSha256, derivativeSha256,
    originalByteLength: 8000, derivativeByteLength: derivativeLength, derivedContentType: 'audio/ogg',
    occurredAtBasis: 'archive-time-proxy-not-capture-date', speakerDiarization: 'not-verified',
    transcriptSync: 'not-verified', authenticity: 'source-derivative-not-generated-autobiography' }
  const memory = { ownerId: uid, title: 'Synthetic emulator recording',
    occurredAt: '2026-10-21T00:00:00.000Z', summary: 'Fictional source metadata for isolated emulator proof.',
    emotionalState: 'unknown', emotionalArc: [], people: [], privacy: 'hidden', deleted: false,
    sourceMedia: [], sourceProvenance: provenance,
    replayManifest: { id: 'source-' + id, version: 1, durationMs: 6000,
      segments: ['memory', 'emotion', 'pattern', 'return'].map((phase, i) => ({ id: phase, label: 'Synthetic',
        caption: 'Fictional', narratorLine: 'Fictional', startsAtMs: i * 1500, durationMs: 1500 })) },
    narrator: { focus: 'source', replay: 'source' },
    star: { id, position: [0, 0, -6], scale: 0.9, aura: '#8adfff', material: 'glass' },
    visuals: { sky: '#061526', ground: '#132b2b', fog: 0.35, particles: 0.5,
      reflection: 0.45, light: '#dffbff', accent: '#8adfff' } }
  const upload = { requiresExistingServerAuthoredMemory: true, requiredSelectedMemoryConsentState: 'authorized',
    offlinePreparationGrantsConsent: false, ownerIdentityVerifiedOffline: false, requiredOwnerAuthFreshnessSeconds: 300,
    requiredCanonicalConsent: 'memory.granted + C1 memory.storage + fully-enforced + no deletion fences',
    initialVisibility: 'hidden', existingCallable: 'registerMemoryMedia',
    existingAuthorityCallable: 'getMemoryMediaUploadAuthority',
    request: { memoryId: id, operationId: 'firstlife_' + sha(uid + '\n' + id + '\n' + derivativeSha256).slice(0, 40),
      kind: 'audio', contentType: 'audio/ogg' },
    fileByteLength: derivativeLength, sha256: derivativeSha256, filePathNotEmbedded: true, base64NotEmbedded: true,
    activateAfter: 'ready owner-scoped receipt, actual playback and current consent checks' }
  return { schemaVersion: 'urai-first-private-memory-preflight-v1',
    status: 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN', firestorePath: pathFor(uid, id),
    memory, upload, recordedTruth: { originalSha256, derivativeSha256, contentType: 'audio/ogg',
      byteLength: derivativeLength, originalByteLength: 8000, occurredAtBasis: provenance.occurredAtBasis,
      claimedReconstruction: false, claimedLifeMovieAcceptance: false } }
}
function confirmed(p) {
  return { packet: p, ownerConfirmation: { authorize: true, memoryId: p.upload.request.memoryId,
    derivativeSha256: p.upload.sha256, visibility: 'hidden' } }
}
async function call(data, token) {
  const response = await fetch(FUNCTIONS + '/createFirstPrivateMemory', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify({ data }), signal: AbortSignal.timeout(30000),
  })
  return { status: response.status, body: await response.json() }
}
function denied(outcome, status, label) {
  assert.ok(outcome.status >= 400, label + ': unexpected HTTP ' + outcome.status)
  assert.equal(outcome.body.error?.status, status, label + ': ' + JSON.stringify(outcome.body))
  cases.push(label)
}
async function main() {
  const owner = await signup('rfinal48-owner'), foreign = await signup('rfinal48-foreign')
  const uid = owner.localId
  try {
    await seed(uid)
    // Generate playable fictional Ogg/Opus bytes inside the isolated runner.
    // No real family recording, fixture download or paid media provider is involved.
    const generated = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
      '-i', 'sine=frequency=330:duration=6', '-ar', '48000', '-ac', '1', '-c:a', 'libopus',
      '-b:a', '12k', '-f', 'ogg', 'pipe:1'], { encoding: null, maxBuffer: 1024 * 1024 })
    assert.equal(generated.status, 0, String(generated.stderr))
    const media = generated.stdout
    assert.ok(media.length > 0 && media.length <= 4 * 1024 * 1024 && media.toString('ascii', 0, 4) === 'OggS')
    // Replay has four 1500-ms phases. The source must span those actual 6000 ms;
    // a one-second source would falsely prove six seconds of recorded life.
    // FFprobe reports N/A duration on non-seekable Ogg pipe input: probe only
    // a short-lived fictional temp file, then remove it before contacting Firebase.
    const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-fictional-opus-'))
    let playbackDurationMs
    try {
      const audioFile = path.join(temporary, 'synthetic-source.ogg')
      fs.writeFileSync(audioFile, media, { flag: 'wx', mode: 0o600 })
      const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', audioFile], {
        encoding: 'utf8', maxBuffer: 1024 * 1024 })
      assert.equal(probe.status, 0, String(probe.stderr))
      playbackDurationMs = Number.parseFloat(String(probe.stdout).trim()) * 1000
    } finally { fs.rmSync(temporary, { recursive: true, force: true }) }
    assert.ok(playbackDurationMs >= 6000 && playbackDurationMs < 6200,
      'Source duration does not match the 6000 ms four-phase Replay manifest')
    const first = packet(uid, 'syntheticFirstPrivateMemory', media)
    denied(await call(confirmed(first), null), 'UNAUTHENTICATED', 'anonymous rejected by real callable')
    denied(await call(confirmed(first), foreign.idToken), 'FAILED_PRECONDITION', 'foreign owner token rejected')
    const missing = confirmed(first); missing.ownerConfirmation.authorize = false
    denied(await call(missing, owner.idToken), 'FAILED_PRECONDITION', 'separate owner confirmation required')
    assert.equal((await db.doc(pathFor(uid, 'syntheticFirstPrivateMemory')).get()).exists, false)
    const created = await call(confirmed(first), owner.idToken)
    assert.equal(created.status, 200, JSON.stringify(created.body))
    assert.deepEqual(created.body.result, { memoryId: 'syntheticFirstPrivateMemory', ownerId: uid,
      visibility: 'hidden', state: 'created-without-media' })
    const snapshot = await db.doc(pathFor(uid, 'syntheticFirstPrivateMemory')).get()
    assert.equal(snapshot.exists, true)
    const data = snapshot.data()
    assert.equal(data.ownerId, uid)
    assert.equal(data.privacy, 'hidden')
    assert.equal(data.sourceMedia.length, 0)
    assert.equal(data.firstPrivateMemoryConsent.canonicalConsentReceiptHash, 'a'.repeat(64))
    assert.ok(data.createdAt instanceof admin.firestore.Timestamp, 'Actual committed server timestamp required')
    cases.push('real Firestore transaction committed hidden owner-scoped memory')
    // Creation consent is not Life Map/Replay visibility. A legitimate owner
    // policy change advances the revision BEFORE the upload receipt is issued.
    // Receipts from an older policy revision must never be silently rebased.
    assert.equal(data.firstPrivateMemoryConsent.consentRevision, 4)
    // Ready media MUST remain inaccessible before the owner's second decision.
    const send = (name, data, token) => fetch(FUNCTIONS + '/' + name, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ data }), signal: AbortSignal.timeout(30000),
    }).then(async r => ({ status: r.status, body: await r.json() }))
    const prePermissionActivation = await send('activateFirstPrivateMemory', {
      memoryId: 'syntheticFirstPrivateMemory', receiptId: 'd'.repeat(64),
      derivativeSha256: sha(media), confirmPrivateReplay: true }, owner.idToken)
    denied(prePermissionActivation, 'FAILED_PRECONDITION',
      'private activation denied without Life Map/Replay permission, before media upload')
    // Explicit synthetic owner consent update: a new policy epoch (5) precedes
    // ALL uploads and private-activation receipt issuance.
    await db.doc('users/' + uid + '/privacyPolicy/current').update({
      revision: 5, 'domains.memory.lifeMapVisible': true, 'domains.memory.replayVisible': true,
    })
    const revisedPolicy = await db.doc('users/' + uid + '/privacyPolicy/current').get()
    assert.equal(revisedPolicy.get('revision'), 5)
    const early = await send('getMemoryMediaUploadAuthority', { memoryId: 'syntheticFirstPrivateMemory' }, owner.idToken)
    assert.equal(early.status, 200, JSON.stringify(early.body))
    const attach = await send('registerMemoryMedia', { memoryId: 'syntheticFirstPrivateMemory',
      operationId: first.upload.request.operationId, kind: 'audio', contentType: 'audio/ogg',
      base64: media.toString('base64') }, owner.idToken)
    assert.equal(attach.status, 200, JSON.stringify(attach.body))
    const uploadReceipt = attach.body.result
    assert.equal(uploadReceipt.state, 'ready')
    assert.equal(uploadReceipt.sha256, sha(media))
    const hiddenPlayback = await send('getMemoryMediaPlaybackAuthority',
      { memoryId: 'syntheticFirstPrivateMemory', receiptId: uploadReceipt.receiptId }, owner.idToken)
    denied(hiddenPlayback, 'FAILED_PRECONDITION', 'hidden uploaded source cannot be played without second owner authorization')
    const activated = await send('activateFirstPrivateMemory', { memoryId: 'syntheticFirstPrivateMemory',
      receiptId: uploadReceipt.receiptId, derivativeSha256: sha(media), confirmPrivateReplay: true }, owner.idToken)
    assert.equal(activated.status, 200, JSON.stringify(activated.body))
    assert.equal(activated.body.result.visibility, 'private')
    const bound = await db.doc(pathFor(uid, 'syntheticFirstPrivateMemory')).get()
    assert.equal(bound.get('privacy'), 'private')
    assert.equal(bound.get('firstPrivateMemoryActivation.mediaReceiptId'), uploadReceipt.receiptId)
    assert.equal(bound.get('firstPrivateMemoryConsent.consentRevision'), 4)
    assert.equal(bound.get('firstPrivateMemoryActivation.consentRevision'), 5)
    const committedReceipt = await db.doc('users/' + uid + '/memoryMediaReceipts/' + uploadReceipt.receiptId).get()
    assert.equal(committedReceipt.get('consentRevision'), 5)
    // Bucket IAM is not emulated. Authenticated activation is proven separately
    // from byte delivery; the emulator must deny unverifiable bucket security.
    const descriptor = await send('getMemoryMediaPlaybackAuthority',
      { memoryId: 'syntheticFirstPrivateMemory', receiptId: uploadReceipt.receiptId }, owner.idToken)
    assert.ok(descriptor.status >= 400, 'Storage emulator unexpectedly certified cloud bucket IAM')
    assert.equal(descriptor.body.error?.status, 'FAILED_PRECONDITION', JSON.stringify(descriptor.body))
    assert.ok(['MEMORY_MEDIA_BUCKET_IAM_UNVERIFIABLE', 'MEMORY_MEDIA_PRIVATE_BUCKET_REQUIRED'].includes(
      descriptor.body.error?.message), 'Unexpected playback denial: ' + JSON.stringify(descriptor.body))
    cases.push('real local Auth Firestore Storage upload and private activation; IAM-unverifiable playback denied')
    await db.doc('consentRecords/' + uid + '_memory_storage').update({ status: 'revoked' })
    const afterRevocation = await send('getMemoryMediaPlaybackAuthority', {
      memoryId: 'syntheticFirstPrivateMemory', receiptId: uploadReceipt.receiptId }, owner.idToken)
    assert.ok(afterRevocation.status >= 400)
    assert.equal(afterRevocation.body.error?.status, 'FAILED_PRECONDITION')
    cases.push('revocation denies post-activation playback authority')
    await db.doc('consentRecords/' + uid + '_memory_storage').update({ status: 'granted' })
    denied(await call(confirmed(first), owner.idToken), 'FAILED_PRECONDITION', 'duplicate create refused')
    assert.equal((await db.doc(pathFor(uid, 'syntheticFirstPrivateMemory')).get()).get('sourceProvenance.originalSha256'), 'c'.repeat(64))
    await db.doc('consentRecords/' + uid + '_memory_storage').update({ status: 'revoked' })
    denied(await call(confirmed(packet(uid, 'syntheticAfterRevoke')), owner.idToken), 'FAILED_PRECONDITION', 'revoked C1 denied')
    assert.equal((await db.doc(pathFor(uid, 'syntheticAfterRevoke')).get()).exists, false)
    await db.doc('consentRecords/' + uid + '_memory_storage').update({ status: 'granted' })
    await db.doc('privacyDeletionTombstones/' + uid).set({ uid, active: true })
    denied(await call(confirmed(packet(uid, 'syntheticWithDeletionFence')), owner.idToken), 'FAILED_PRECONDITION', 'deletion fence denied')
    assert.equal((await db.doc(pathFor(uid, 'syntheticWithDeletionFence')).get()).exists, false)
    console.log(JSON.stringify({ schemaVersion: 'urai-rfinal48-first-memory-emulator-v1', outcome: 'PASS',
      realAuthEmulatorIdTokens: true, realFirestoreTransactions: true, actualCallableEndpoint: true,
      privateMediaImported: true, protectedPlaybackBytesVerified: false,
      consentRevocationPlaybackDenied: true, cloudBucketIAMVerified: false, recordedSourceDurationMs: playbackDurationMs,
      productionTested: false, browserPlaybackTested: false, cases }, null, 2))
  } finally {
    await db.recursiveDelete(db.doc('users/' + uid)).catch(() => {})
    await db.doc('consentRecords/' + uid + '_memory_storage').delete().catch(() => {})
    await db.doc('privacyDeletionTombstones/' + uid).delete().catch(() => {})
    await admin.auth().deleteUser(uid).catch(() => {})
    await admin.auth().deleteUser(foreign.localId).catch(() => {})
    await db.terminate(); await app.delete()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
