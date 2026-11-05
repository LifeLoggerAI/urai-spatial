import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'

// This suite MUST run only under a genuine Firestore emulator with compiled
// Functions. It is not a static or in-memory imitation of a callable.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('SPEECH_PURPOSE_REAL_FIRESTORE_EMULATOR_REQUIRED')
}
process.env.GCLOUD_PROJECT ||= 'demo-urai-speech-purpose'
process.env.GOOGLE_CLOUD_PROJECT ||= process.env.GCLOUD_PROJECT

const requireFunctions = createRequire(new URL('../apps/functions/package.json', import.meta.url))
const admin = requireFunctions('firebase-admin')
const compiledPath = path.resolve('apps/functions/lib/apps/functions/src/speechPurposeConsent.js')
const { grantSpeechPurposeLease, revokeSpeechPurposeLease } = requireFunctions(compiledPath)
const db = admin.firestore()
const uid = 'speech-owner-a'
const otherUid = 'speech-owner-b'
const sourceId = 'trusted-speech-source'
const providerId = 'trusted-speech-provider'
const maxDuration = 30 * 60 * 1000
const context = (owner = uid, offsetSeconds = 0) => ({
  auth: { uid: owner, token: { auth_time: Math.floor(Date.now() / 1000) - offsetSeconds } },
})
const payload = (sessionId, overrides = {}) => ({
  sessionId, sourceId, providerId,
  transcriptionConsent: true, inferenceConsent: true,
  sessionBaselineConsent: false, userInitiated: true,
  ...overrides,
})
const leasePath = (sessionId, owner = uid) =>
  'users/' + owner + '/speechPurposeLeases/' + sessionId
const purgePath = (sessionId, owner = uid) => {
  const key = createHash('sha256')
    .update('urai:speech-purge:v1\0' + owner + '\0' + sessionId)
    .digest('hex')
  return 'speechProviderPurgeQueue/' + key
}
const policyPath = (owner = uid) =>
  'users/' + owner + '/privacyPolicy/current'
const baseDomain = {
  mode: 'denied', retentionDays: 30, precise: false,
  replayVisible: false, lifeMapVisible: false, modelContext: false,
  sharingEnabled: false, automationEnabled: false, likenessEnabled: false,
}
function policy(owner = uid, overrides = {}) {
  const models = { ...baseDomain, mode: 'granted', modelContext: true }
  return {
    version: 2, revision: 7, ownerId: owner,
    domains: {
      memory: { ...baseDomain }, location: { ...baseDomain },
      models, exports: { ...baseDomain }, workforce: { ...baseDomain },
      identity: { ...baseDomain },
    },
    enforcement: {
      state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'complete',
    },
    ...overrides,
  }
}
async function seedOwner(owner = uid) {
  const prefix = 'users/' + owner + '/'
  await Promise.all([
    db.doc(policyPath(owner)).set(policy(owner)),
    db.doc(prefix + 'dataSources/' + sourceId).set({
      ownerId: owner, state: 'active', verified: true, speechFeatureSource: true,
    }),
    db.doc(prefix + 'providerConnections/' + providerId).set({
      ownerId: owner, state: 'active', verified: true, speechInferenceAuthorized: true,
    }),
  ])
}
async function expectCode(promise, code) {
  await assert.rejects(promise, error => error && error.code === code)
}
test.before(async () => {
  await Promise.all([seedOwner(), seedOwner(otherUid)])
})
test.after(async () => {
  await admin.app().delete()
})

test('grant requires a signed-in, recently authenticated owner', async () => {
  await expectCode(grantSpeechPurposeLease.run(payload('not-signed-in'), {}), 'unauthenticated')
  await expectCode(grantSpeechPurposeLease.run(payload('old-auth'), context(uid, 301)), 'failed-precondition')
  await expectCode(grantSpeechPurposeLease.run(payload('future-auth'), context(uid, -301)), 'failed-precondition')
  assert.equal((await db.doc(leasePath('old-auth')).get()).exists, false)
})

test('independent transcription, acoustic inference, and baseline choices are mandatory', async () => {
  const attempts = [
    { transcriptionConsent: false }, { transcriptionConsent: undefined },
    { inferenceConsent: false }, { inferenceConsent: undefined },
    { sessionBaselineConsent: undefined }, { sessionBaselineConsent: 'false' },
    { userInitiated: false }, { userInitiated: undefined },
  ]
  for (let i = 0; i < attempts.length; i++) {
    const sessionId = 'missing-purpose-' + i
    await expectCode(
      grantSpeechPurposeLease.run(payload(sessionId, attempts[i]), context()),
      'permission-denied',
    )
    assert.equal((await db.doc(leasePath(sessionId)).get()).exists, false)
  }
})

test('verified owner, source and provider plus canonical policy are required', async () => {
  const wrong = [
    { field: 'source', path: 'users/' + uid + '/dataSources/' + sourceId,
      value: { ownerId: uid, state: 'active', verified: false, speechFeatureSource: true } },
    { field: 'provider', path: 'users/' + uid + '/providerConnections/' + providerId,
      value: { ownerId: uid, state: 'active', verified: false, speechInferenceAuthorized: true } },
    { field: 'models', path: policyPath(), value: policy(uid, {
      domains: { ...policy().domains, models: { ...policy().domains.models, modelContext: false } },
    }) },
    { field: 'enforcement', path: policyPath(), value: policy(uid, {
      enforcement: { ...policy().enforcement, state: 'pending' },
    }) },
  ]
  for (const item of wrong) {
    const ref = db.doc(item.path)
    const previous = (await ref.get()).data()
    await ref.set(item.value)
    try {
      await expectCode(grantSpeechPurposeLease.run(payload('denied-' + item.field), context()),
        item.field === 'source' || item.field === 'provider'
          ? 'failed-precondition' : 'permission-denied')
    } finally {
      await ref.set(previous)
    }
  }
  await expectCode(grantSpeechPurposeLease.run(payload('bad-source', { sourceId: 'unknown-source' }), context()), 'failed-precondition')
  await expectCode(grantSpeechPurposeLease.run(payload('bad-provider', { providerId: 'unknown-provider' }), context()), 'failed-precondition')
})

test('grant is bounded to 30 minutes and baseline stays denied by default', async () => {
  const answer = await grantSpeechPurposeLease.run(payload('grant-baseline-off'), context())
  const snap = await db.doc(leasePath('grant-baseline-off')).get()
  assert.equal(answer.active, true)
  assert.equal(answer.providerReady, false)
  assert.equal(snap.get('schemaVersion'), 'urai-speech-lease-v1')
  assert.equal(snap.get('ownerId'), uid)
  assert.equal(snap.get('policyRevision'), 7)
  assert.equal(snap.get('transcription'), true)
  assert.equal(snap.get('inference'), true)
  assert.equal(snap.get('sessionBaseline'), false)
  assert.equal(snap.get('expiresAtMs') - snap.get('issuedAtMs'), maxDuration)
  assert.equal(answer.revision, 1)
  const baseline = await grantSpeechPurposeLease.run(
    payload('grant-baseline-on', { sessionBaselineConsent: true }), context())
  assert.equal(baseline.sessionBaseline, true)
  assert.equal((await db.doc(leasePath('grant-baseline-on')).get()).get('sessionBaseline'), true)
})

test('concurrent grants for one session cannot issue two active leases', async () => {
  const outcomes = await Promise.allSettled([
    grantSpeechPurposeLease.run(payload('concurrent-grant'), context()),
    grantSpeechPurposeLease.run(payload('concurrent-grant'), context()),
  ])
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1)
  assert.equal(outcomes.filter(x => x.status === 'rejected'
    && x.reason?.code === 'already-exists').length, 1)
  const record = await db.doc(leasePath('concurrent-grant')).get()
  assert.equal(record.get('revision'), 1)
})

test('revocation is owner-only, bumps revision, and disables all three purposes', async () => {
  await grantSpeechPurposeLease.run(payload('revoke-me', { sessionBaselineConsent: true }), context())
  await expectCode(revokeSpeechPurposeLease.run({ sessionId: 'revoke-me' }, {}), 'unauthenticated')
  await expectCode(revokeSpeechPurposeLease.run({ sessionId: 'revoke-me' }, context(otherUid)), 'not-found')
  const revoked = await revokeSpeechPurposeLease.run({ sessionId: 'revoke-me' }, context())
  assert.deepEqual({ revision: revoked.revision, active: revoked.active,
    providerPurgeVerified: revoked.providerPurgeVerified },
    { revision: 2, active: false, providerPurgeVerified: false })
  const saved = await db.doc(leasePath('revoke-me')).get()
  for (const key of ['transcription', 'inference', 'sessionBaseline', 'active'])
    assert.equal(saved.get(key), false)
})

test('revoked session is terminal: fresh consent must use a fresh session ID', async () => {
  await grantSpeechPurposeLease.run(payload('terminal-session'), context())
  await revokeSpeechPurposeLease.run({ sessionId: 'terminal-session' }, context())
  await expectCode(
    grantSpeechPurposeLease.run(payload('terminal-session'), context()),
    'failed-precondition',
  )
  const saved = await db.doc(leasePath('terminal-session')).get()
  assert.equal(saved.get('active'), false)
  assert.equal(saved.get('revision'), 2)
  const separate = await grantSpeechPurposeLease.run(payload('new-session-after-revoke'), context())
  assert.equal(separate.revision, 1)
})


test('revocation atomically creates a pending, redacted provider cleanup obligation', async () => {
  const sessionId = 'purge-atomically'
  await grantSpeechPurposeLease.run(payload(sessionId, { sessionBaselineConsent: true }), context())
  assert.equal((await db.doc(purgePath(sessionId)).get()).exists, false)
  const result = await revokeSpeechPurposeLease.run({ sessionId }, context())
  assert.equal(result.active, false)
  assert.equal(result.revision, 2)
  assert.equal(result.purgeState, 'requested')
  assert.equal(result.providerPurgeVerified, false)
  const job = await db.doc(purgePath(sessionId)).get()
  assert.equal(job.exists, true)
  assert.equal(job.id, result.purgeJobId)
  assert.equal(job.get('schemaVersion'), 'urai-speech-purge-job-v1')
  assert.equal(job.get('ownerId'), uid)
  assert.equal(job.get('providerId'), providerId)
  assert.equal(job.get('sourceId'), sourceId)
  assert.equal(job.get('sessionId'), sessionId)
  assert.equal(job.get('leaseRevision'), 2)
  assert.equal(job.get('state'), 'requested')
  assert.equal(job.get('providerState'), 'pending')
  assert.equal(job.get('localCacheState'), 'pending')
  assert.equal(job.get('providerPurgeVerified'), false)
  assert.deepEqual(job.get('scopes'), [
    'speech-transcript', 'acoustic-features', 'session-baseline', 'provider-session',
  ])
  for (const forbidden of ['rawAudio', 'transcript', 'audioBytes', 'featureValues', 'providerReceipt']) {
    assert.equal(Object.hasOwn(job.data(), forbidden), false)
  }
  const originalUpdated = job.get('updatedAt').toMillis()
  const repeated = await revokeSpeechPurposeLease.run({ sessionId }, context())
  assert.equal(repeated.revision, 2)
  assert.equal(repeated.purgeJobId, result.purgeJobId)
  assert.equal(repeated.providerPurgeVerified, false)
  assert.equal((await db.doc(purgePath(sessionId)).get()).get('updatedAt').toMillis(), originalUpdated)
})

test('conflicting provider cleanup queue prevents partial revocation', async () => {
  const sessionId = 'purge-conflict'
  await grantSpeechPurposeLease.run(payload(sessionId), context())
  await db.doc(purgePath(sessionId)).set({
    ownerId: uid, sessionId, sourceId, providerId: 'wrong-provider',
    leaseRevision: 2, state: 'requested',
  })
  await expectCode(revokeSpeechPurposeLease.run({ sessionId }, context()), 'failed-precondition')
  assert.equal((await db.doc(leasePath(sessionId)).get()).get('active'), true)
  await db.doc(purgePath(sessionId)).delete()
  const success = await revokeSpeechPurposeLease.run({ sessionId }, context())
  assert.equal(success.revision, 2)
  assert.equal((await db.doc(purgePath(sessionId)).get()).get('state'), 'requested')
})

test('simultaneous revocations are idempotent and create a single cleanup job', async () => {
  const sessionId = 'purge-parallel'
  await grantSpeechPurposeLease.run(payload(sessionId), context())
  const outcomes = await Promise.all([
    revokeSpeechPurposeLease.run({ sessionId }, context()),
    revokeSpeechPurposeLease.run({ sessionId }, context()),
  ])
  assert.equal(outcomes[0].revision, 2)
  assert.equal(outcomes[1].revision, 2)
  assert.equal(outcomes[0].purgeJobId, outcomes[1].purgeJobId)
  const lease = await db.doc(leasePath(sessionId)).get()
  const job = await db.doc(purgePath(sessionId)).get()
  assert.equal(lease.get('active'), false)
  assert.equal(job.get('leaseRevision'), 2)
  assert.equal(job.get('attempts'), 0)
})
