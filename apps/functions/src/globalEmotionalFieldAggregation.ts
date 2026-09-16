import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const fv = admin.firestore.FieldValue
const PURPOSE = 'data.public-good.emotional-field'
const BUCKET_MS = 6 * 60 * 60 * 1000

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}
function bucketFor(now = Date.now()) { return new Date(Math.floor(now / BUCKET_MS) * BUCKET_MS).toISOString() }
function contributionId(uid: string, bucket: string) { return createHash('sha256').update(`${PURPOSE}:${uid}:${bucket}`).digest('hex').slice(0, 40) }
function validCountry(value: unknown) { const country = String(value ?? '').toUpperCase(); return /^[A-Z]{2}$/.test(country) ? country : null }

export const getGlobalEmotionalFieldSnapshot = functions.https.onCall(async (data, context) => {
  requireUid(context)
  const country = validCountry(data?.country)
  if (!country) return { state: 'unavailable', reason: 'COUNTRY_REQUIRED', cell: null, publicationState: 'blocked-pending-governance-and-aggregate-provider' }
  const bucket = typeof data?.timeBucket === 'string' ? data.timeBucket : bucketFor()
  const cellId = `${country}_${bucket.replace(/[^0-9]/g, '').slice(0, 10)}`
  const snapshot = await db.doc(`globalEmotionalFieldCells/${cellId}`).get()
  if (!snapshot.exists) return { state: 'unavailable', reason: 'NO_PUBLISHED_SAFE_AGGREGATE', cell: null, publicationState: 'blocked-pending-governance-and-aggregate-provider' }
  const cell = snapshot.data() ?? {}
  if (cell.publicationState !== 'published' || cell.precision !== 'country' || !cell.policyVersion || !cell.riskAssessmentId) {
    return { state: 'suppressed', reason: 'CELL_NOT_PUBLICATION_SAFE', cell: null, publicationState: 'blocked' }
  }
  const safeCell = { id: cell.id, regionKey: cell.regionKey, precision: cell.precision, timeBucket: cell.timeBucket, signal: cell.signal, confidence: cell.confidence, policyVersion: cell.policyVersion }
  return { state: 'aggregate', reason: 'SAFE_PUBLISHED_AGGREGATE', cell: safeCell, publicationState: 'published' }
})

export const submitGlobalEmotionalFieldContribution = functions.https.onCall(async (data, context) => {
  const ownerId = requireUid(context)
  if (data?.signal !== undefined || data?.emotion !== undefined || data?.raw !== undefined) {
    throw new functions.https.HttpsError('failed-precondition', 'Sensitive emotional input producer is not activated.')
  }
  const country = validCountry(data?.country)
  if (!country) throw new functions.https.HttpsError('invalid-argument', 'Country precision is required.')
  const policySnapshot = await db.doc(`users/${ownerId}/privacyPolicy/globalEmotionalField`).get()
  const policy = policySnapshot.data() ?? {}
  if (policy.purpose !== PURPOSE || policy.consentTier !== 'C8' || policy.mode === 'off') throw new functions.https.HttpsError('permission-denied', 'Dedicated C8 public-good consent is required.')
  if (policy.precision !== 'country') throw new functions.https.HttpsError('failed-precondition', 'Launch contribution precision is country-only.')
  const bucket = bucketFor()
  const id = contributionId(ownerId, bucket)
  const ref = db.doc(`globalEmotionalFieldIntake/${id}`)
  await ref.set({ id, ownerId, purpose: PURPOSE, contributionKind: 'cohort-participation-only', country, precision: 'country', timeBucket: bucket, consentRevision: Number(policy.revision ?? 0), signalProviderState: 'not-activated', publicationState: 'blocked-pending-sensitive-provider-and-governance', createdAt: fv.serverTimestamp(), expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000) }, { merge: false })
  return { accepted: true, contributionKind: 'cohort-participation-only', timeBucket: bucket, publicationState: 'blocked-pending-sensitive-provider-and-governance' }
})

export const revokePendingGlobalFieldContribution = functions.https.onCall(async (_data, context) => {
  const ownerId = requireUid(context)
  const bucket = bucketFor()
  await db.doc(`globalEmotionalFieldIntake/${contributionId(ownerId, bucket)}`).delete()
  return { revoked: true, timeBucket: bucket }
})
