import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const speechRegion = functions.region('us-central1')
const ID = /^[A-Za-z0-9_-]{1,128}$/
const MAX_LEASE_MS = 30 * 60 * 1000

// Deterministic per-owner/session queue identity is not based on raw speech,
// transcript, or provider content. Queue records must never contain those.
function purgeJobId(uid: string, sessionId: string): string {
  return createHash('sha256').update('urai:speech-purge:v1\0' + uid + '\0' + sessionId).digest('hex')
}

function uidOf(context: functions.https.CallableContext): string {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'AUTH_REQUIRED')
  return uid
}
function idOf(input: unknown, label: string): string {
  if (typeof input !== 'string' || !ID.test(input))
    throw new functions.https.HttpsError('invalid-argument', label + '_INVALID')
  return input
}
function recentAuth(context: functions.https.CallableContext): void {
  const issued = context.auth?.token?.auth_time
  const now = Math.floor(Date.now() / 1000)
  if (typeof issued !== 'number' || !Number.isSafeInteger(issued) || issued <= 0
      || issued > now || now - issued > 300)
    throw new functions.https.HttpsError('failed-precondition', 'RECENT_REAUTHENTICATION_REQUIRED')
}
function checkPolicy(raw: unknown, uid: string): number {
  if (!isCanonicalStoredPolicy(raw, uid)
      || raw.enforcement.state !== 'fully-enforced'
      || !['granted', 'limited'].includes(raw.domains.models.mode)
      || raw.domains.models.modelContext !== true)
    throw new functions.https.HttpsError('permission-denied', 'SPEECH_MODEL_POLICY_REQUIRED')
  return raw.revision
}
function validCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * A short-lived, owner-authorized purpose lease. No audio is collected or
 * transmitted and no inference is invoked by this callable.
 *
 * This is NOT automatic consent: a direct authenticated user interaction must
 * supply each separate purpose grant, never a prechecked default.
 * Source/provider registrations must already be server verified and active;
 * client-supplied identifiers alone never establish source authority.
 */
export const grantSpeechPurposeLease = speechRegion.https.onCall(async (data, context) => {
  const uid = uidOf(context)
  recentAuth(context)
  if (data?.transcriptionConsent !== true || data?.inferenceConsent !== true
      || (data?.sessionBaselineConsent !== true && data?.sessionBaselineConsent !== false)
      || data?.userInitiated !== true)
    throw new functions.https.HttpsError('permission-denied', 'SEPARATE_SPEECH_PURPOSE_CONSENTS_REQUIRED')
  const sessionId = idOf(data?.sessionId, 'SESSION_ID')
  const sourceId = idOf(data?.sourceId, 'SOURCE_ID')
  const providerId = idOf(data?.providerId, 'PROVIDER_ID')
  if (data?.durationMs !== undefined && data.durationMs !== MAX_LEASE_MS)
    throw new functions.https.HttpsError('invalid-argument', 'SPEECH_LEASE_DURATION_INVALID')
  const policyRef = db.doc(`users/${uid}/privacyPolicy/current`)
  const sourceRef = db.doc(`users/${uid}/dataSources/${sourceId}`)
  const providerRef = db.doc(`users/${uid}/providerConnections/${providerId}`)
  const leaseRef = db.doc(`users/${uid}/speechPurposeLeases/${sessionId}`)
  return db.runTransaction(async tx => {
    const [policySnap, sourceSnap, providerSnap, existing] = await Promise.all([
      tx.get(policyRef), tx.get(sourceRef), tx.get(providerRef), tx.get(leaseRef),
    ])
    const policyRevision = checkPolicy(policySnap.data(), uid)
    // Registration is server-authoritative: user clients cannot write either
    // underlying collection through Firestore security rules.
    if (sourceSnap.get('ownerId') !== uid || sourceSnap.get('state') !== 'active'
        || sourceSnap.get('verified') !== true || sourceSnap.get('speechFeatureSource') !== true
        || providerSnap.get('ownerId') !== uid || providerSnap.get('state') !== 'active'
        || providerSnap.get('verified') !== true || providerSnap.get('speechInferenceAuthorized') !== true)
      throw new functions.https.HttpsError('failed-precondition', 'VERIFIED_SPEECH_SOURCE_PROVIDER_REQUIRED')
    const previous = existing.data()
    if (existing.exists && (previous?.ownerId !== uid || previous?.sessionId !== sessionId
        || !validCounter(previous?.revision)))
      throw new functions.https.HttpsError('permission-denied', 'SPEECH_LEASE_INVALID')
    // A session ID is single-use. Revocation is terminal: allowing a grant
    // to revive an inactive lease could admit delayed callbacks from the
    // previously revoked provider/source revision into a new session.
    // Reauthorization must create a fresh session ID and consent record.
    if (existing.exists) {
      if (previous?.active === true)
        throw new functions.https.HttpsError('already-exists', 'SPEECH_SESSION_ALREADY_ACTIVE')
      throw new functions.https.HttpsError('failed-precondition', 'SPEECH_SESSION_TERMINAL_NEW_ID_REQUIRED')
    }
    const revision = 1
    const issuedAtMs = Date.now()
    const expiresAtMs = issuedAtMs + MAX_LEASE_MS
    tx.set(leaseRef, {
      schemaVersion: 'urai-speech-lease-v1',
      ownerId: uid, sessionId, sourceId, providerId, policyRevision,
      revision, active: true, issuedAtMs, expiresAtMs,
      transcription: true, inference: true,
      sessionBaseline: data.sessionBaselineConsent === true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return { sessionId, revision, expiresAtMs, active: true,
      transcription: true, inference: true, sessionBaseline: data.sessionBaselineConsent === true,
      providerReady: false }
  })
})

/**
 * Revocation is immediately enforced by the versioned lease. The inference
 * adapter must re-read this lease after every async source or baseline read.
 * This does not claim upstream deletion/purge: those require separate provider
 * acknowledgement and a verified purge callback.
 */
export const revokeSpeechPurposeLease = speechRegion.https.onCall(async (data, context) => {
  const uid = uidOf(context)
  const sessionId = idOf(data?.sessionId, 'SESSION_ID')
  const leaseRef = db.doc(`users/${uid}/speechPurposeLeases/${sessionId}`)
  const purgeJobIdValue = purgeJobId(uid, sessionId)
  const purgeRef = db.doc(`speechProviderPurgeQueue/${purgeJobIdValue}`)

  // Read both records BEFORE any write, then update lease and create the
  // durable cleanup obligation atomically. Firestore transaction retries
  // serialize simultaneous revocations. Purge is NEVER marked verified here.
  return db.runTransaction(async tx => {
    const [lease, existingPurge] = await Promise.all([
      tx.get(leaseRef), tx.get(purgeRef),
    ])
    if (!lease.exists || lease.get('ownerId') !== uid
        || lease.get('sessionId') !== sessionId
        || lease.get('schemaVersion') !== 'urai-speech-lease-v1'
        || !validCounter(lease.get('revision'))
        || !ID.test(String(lease.get('providerId') ?? ''))
        || !ID.test(String(lease.get('sourceId') ?? ''))) {
      throw new functions.https.HttpsError('not-found', 'SPEECH_LEASE_NOT_FOUND')
    }
    const currentRevision = lease.get('revision') as number
    const wasActive = lease.get('active') === true
    if (wasActive && currentRevision >= Number.MAX_SAFE_INTEGER)
      throw new functions.https.HttpsError('failed-precondition', 'SPEECH_REVISION_EXHAUSTED')
    const revision = wasActive ? currentRevision + 1 : currentRevision
    const providerId = lease.get('providerId') as string
    const sourceId = lease.get('sourceId') as string
    if (existingPurge.exists
        && (existingPurge.get('ownerId') !== uid
          || existingPurge.get('sessionId') !== sessionId
          || existingPurge.get('providerId') !== providerId
          || existingPurge.get('sourceId') !== sourceId
          || existingPurge.get('leaseRevision') !== revision
          || typeof existingPurge.get('state') !== 'string'
          || !['requested', 'in-progress', 'pending-acknowledgement', 'verified', 'failed'].includes(existingPurge.get('state')))) {
      throw new functions.https.HttpsError('failed-precondition', 'SPEECH_PURGE_QUEUE_CONFLICT')
    }
    if (wasActive) {
      const now = admin.firestore.FieldValue.serverTimestamp()
      tx.update(leaseRef, {
        active: false, transcription: false, inference: false,
        sessionBaseline: false, revision, revokedAt: now, updatedAt: now,
      })
    }

    // If a previously inactive lease has no cleanup record, reconcile it
    // without reviving its source permissions. A repeat revocation with an
    // existing queue leaves both records untouched (idempotent).
    if (!existingPurge.exists) {
      const now = admin.firestore.FieldValue.serverTimestamp()
      tx.create(purgeRef, {
        schemaVersion: 'urai-speech-purge-job-v1',
        purgeJobId: purgeJobIdValue,
        ownerId: uid, sessionId, sourceId, providerId,
        leaseRevision: revision,
        state: 'requested',
        localCacheState: 'pending',
        providerState: 'pending',
        scopes: ['speech-transcript', 'acoustic-features', 'session-baseline', 'provider-session'],
        attempts: 0,
        // No provider-verified receipt or claimant-controlled success here.
        providerPurgeVerified: false, createdAt: now, updatedAt: now,
      })
    }
    return {
      sessionId, revision, active: false,
      purgeJobId: purgeJobIdValue,
      purgeState: existingPurge.exists ? existingPurge.get('state') : 'requested',
      providerPurgeVerified: false,
    }
  })
})
