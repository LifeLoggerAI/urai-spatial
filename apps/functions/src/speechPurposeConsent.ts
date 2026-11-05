import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const speechRegion = functions.region('us-central1')
const ID = /^[A-Za-z0-9_-]{1,128}$/
const MAX_LEASE_MS = 30 * 60 * 1000

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
    if (existing.exists && previous?.active === true)
      throw new functions.https.HttpsError('already-exists', 'SPEECH_SESSION_ALREADY_ACTIVE')
    const revision = existing.exists ? (previous!.revision as number) + 1 : 1
    if (!Number.isSafeInteger(revision))
      throw new functions.https.HttpsError('failed-precondition', 'SPEECH_REVISION_EXHAUSTED')
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
  const ref = db.doc(`users/${uid}/speechPurposeLeases/${sessionId}`)
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref)
    if (!snapshot.exists || snapshot.get('ownerId') !== uid
        || snapshot.get('sessionId') !== sessionId
        || !validCounter(snapshot.get('revision')))
      throw new functions.https.HttpsError('not-found', 'SPEECH_LEASE_NOT_FOUND')
    const previousRevision = snapshot.get('revision') as number
    if (previousRevision >= Number.MAX_SAFE_INTEGER)
      throw new functions.https.HttpsError('failed-precondition', 'SPEECH_REVISION_EXHAUSTED')
    const revision = previousRevision + 1
    tx.update(ref, {
      active: false, transcription: false, inference: false, sessionBaseline: false,
      revision, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return { sessionId, revision, active: false, providerPurgeVerified: false }
  })
})
