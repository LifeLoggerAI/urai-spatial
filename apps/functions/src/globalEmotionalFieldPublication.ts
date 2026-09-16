import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const fv = admin.firestore.FieldValue
const PURPOSE = 'data.public-good.emotional-field'
const ABSOLUTE_FLOOR = 100
const MAX_BATCH_WRITES = 450

function requireGovernanceAdmin(context: functions.https.CallableContext) {
  const token = context.auth?.token
  if (!context.auth || (token?.admin !== true && token?.founder !== true)) {
    throw new functions.https.HttpsError('permission-denied', 'Governed publication authority is required.')
  }
}
function stableId(prefix: string, ...parts: string[]) {
  return `${prefix}${createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 32)}`
}
function currentBucket(now = Date.now()) {
  const bucketMs = 6 * 60 * 60 * 1000
  return new Date(Math.floor(now / bucketMs) * bucketMs).toISOString()
}
function previousBucket(now = Date.now()) { return currentBucket(now - 6 * 60 * 60 * 1000) }

/**
 * Deletes only expired pre-publication contribution envelopes. It never touches
 * published de-identified aggregates.
 */
export const expireGlobalEmotionalFieldIntake = functions.pubsub.schedule('every 60 minutes').timeZone('UTC').onRun(async () => {
  const snapshot = await db.collection('globalEmotionalFieldIntake').where('expiresAt', '<=', admin.firestore.Timestamp.now()).limit(MAX_BATCH_WRITES).get()
  if (snapshot.empty) return null
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  return null
})

/**
 * Launch-safe batch construction. Current intake contains participation envelopes
 * only; no C4 emotional vector is activated. Batches are therefore deliberately
 * suppressed and can never become emotional cells by this job alone.
 */
export const aggregateGlobalEmotionalField = functions.pubsub.schedule('15 */6 * * *').timeZone('UTC').onRun(async () => {
  const timeBucket = previousBucket()
  const intake = await db.collection('globalEmotionalFieldIntake').where('timeBucket', '==', timeBucket).limit(5000).get()
  const perCountry = new Map<string, Set<string>>()
  for (const doc of intake.docs) {
    const data = doc.data()
    if (data.purpose !== PURPOSE || data.precision !== 'country' || data.contributionKind !== 'cohort-participation-only') continue
    const country = typeof data.country === 'string' ? data.country : ''
    const ownerId = typeof data.ownerId === 'string' ? data.ownerId : ''
    if (!/^[A-Z]{2}$/.test(country) || !ownerId) continue
    if (!perCountry.has(country)) perCountry.set(country, new Set())
    perCountry.get(country)?.add(ownerId)
  }
  for (const [country, owners] of perCountry.entries()) {
    const batchId = stableId('gfb_', country, timeBucket)
    const riskAssessmentId = stableId('gfr_', country, timeBucket)
    const cohortSize = owners.size
    const suppressionReason = cohortSize < ABSOLUTE_FLOOR ? 'INSUFFICIENT_ABSOLUTE_COHORT' : 'SENSITIVE_SIGNAL_PROVIDER_NOT_ACTIVATED'
    await Promise.all([
      db.doc(`globalEmotionalFieldRiskAssessments/${riskAssessmentId}`).set({
        id: riskAssessmentId, purpose: PURPOSE, regionKey: country, precision: 'country', timeBucket,
        cohortSize, absoluteFloor: ABSOLUTE_FLOOR, sensitiveHigherThresholdRequired: true,
        sensitiveHigherThresholdApproved: false, sensitiveHigherThresholdValue: null,
        rawSensitivePayloadPresent: false, signalProviderState: 'not-activated', decision: 'suppress',
        reason: suppressionReason, policyVersion: 'global-emotional-field-v1-draft', createdAt: fv.serverTimestamp(),
      }),
      db.doc(`globalEmotionalFieldBatches/${batchId}`).set({
        id: batchId, purpose: PURPOSE, regionKey: country, precision: 'country', timeBucket, cohortSize,
        riskAssessmentId, signalState: 'not-activated', publicationState: 'suppressed', suppressionReason,
        sourceEnvelopeCount: owners.size, containsUidList: false, containsRawSensitivePayload: false,
        createdAt: fv.serverTimestamp(), updatedAt: fv.serverTimestamp(),
      }),
    ])
  }
  return null
})

/**
 * Human-governed publication boundary. Even an authorized administrator cannot
 * override absent signal authority, absent risk receipts, cohort floors, or the
 * unapproved sensitive threshold. No client can call this path directly without
 * an authenticated admin/founder claim.
 */
export const publishGlobalEmotionalFieldBatch = functions.https.onCall(async (data, context) => {
  requireGovernanceAdmin(context)
  const batchId = String(data?.batchId ?? '')
  if (!/^gfb_[a-f0-9]{32}$/.test(batchId)) throw new functions.https.HttpsError('invalid-argument', 'Invalid batchId.')
  const ref = db.doc(`globalEmotionalFieldBatches/${batchId}`)
  const snapshot = await ref.get()
  if (!snapshot.exists) throw new functions.https.HttpsError('not-found', 'Aggregate batch not found.')
  const batch = snapshot.data() ?? {}
  const riskSnapshot = batch.riskAssessmentId ? await db.doc(`globalEmotionalFieldRiskAssessments/${batch.riskAssessmentId}`).get() : null
  const risk = riskSnapshot?.data() ?? {}
  const blockers: string[] = []
  if (batch.signalState !== 'ready') blockers.push('SENSITIVE_SIGNAL_PROVIDER_NOT_ACTIVATED')
  if (!riskSnapshot?.exists) blockers.push('RISK_ASSESSMENT_REQUIRED')
  if (Number(batch.cohortSize ?? 0) < ABSOLUTE_FLOOR) blockers.push('INSUFFICIENT_ABSOLUTE_COHORT')
  if (risk.sensitiveHigherThresholdApproved !== true || !Number.isFinite(risk.sensitiveHigherThresholdValue) || Number(risk.sensitiveHigherThresholdValue) <= ABSOLUTE_FLOOR) blockers.push('GOVERNED_HIGHER_SENSITIVE_THRESHOLD_REQUIRED')
  if (risk.decision !== 'publish') blockers.push('RISK_DECISION_NOT_PUBLISH')
  if (blockers.length) {
    const receiptId = stableId('gfpr_', batchId, String(Date.now()))
    await db.doc(`globalEmotionalFieldPublicationReceipts/${receiptId}`).create({ id: receiptId, batchId, result: 'blocked', blockers, createdAt: fv.serverTimestamp() })
    return { published: false, batchId, blockers, receiptId }
  }
  // No publication implementation is reachable until the governed sensitive
  // provider writes a separately reviewed ready batch shape. This deliberate
  // terminal guard prevents future source drift from accidentally publishing.
  throw new functions.https.HttpsError('failed-precondition', 'PUBLICATION_ADAPTER_NOT_ACTIVATED')
})
