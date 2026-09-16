import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash, randomUUID } from 'node:crypto'
import { scenarioProviderState } from './scenarioProvider'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const fv = admin.firestore.FieldValue

const BRANCH_LIMIT = 3
const SCENARIO_PURPOSE = 'scenario.explore'
const ALLOWED_ORIGINS = new Set(['home','ground','life-map','focus','replay','passport','mirror','council','possible-futures'])

function uid(context: functions.https.CallableContext) {
  const value = context.auth?.uid
  if (!value) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return value
}
function operationId(value: unknown) {
  const id = String(value ?? '')
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(id)) throw new functions.https.HttpsError('invalid-argument', 'A valid operationId is required.')
  return id
}
function opaque(prefix: string) { return `${prefix}${randomUUID().replace(/-/g, '')}` }
function stableReceipt(ownerId: string, op: string, kind: string) { return createHash('sha256').update(`${kind}:${ownerId}:${op}`).digest('hex').slice(0, 40) }
function scenarioRef(ownerId: string, scenarioId: string) { return db.doc(`users/${ownerId}/scenarios/${scenarioId}`) }
function ensureScenarioId(value: unknown) {
  const id = String(value ?? '')
  if (!/^scn_[A-Za-z0-9_-]{12,96}$/.test(id)) throw new functions.https.HttpsError('invalid-argument', 'Invalid scenarioId.')
  return id
}
function boundedQuestion(value: unknown) {
  const question = String(value ?? '').trim()
  if (!question || question.length > 1200) throw new functions.https.HttpsError('invalid-argument', 'Scenario question is required and must be 1200 characters or fewer.')
  return question
}
function asStringArray(value: unknown, max = 64) {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0).slice(0, max)
}
function evidenceIdsFromBasis(basis: FirebaseFirestore.DocumentData | undefined) {
  const refs = Array.isArray(basis?.evidenceRefs) ? basis.evidenceRefs : []
  return new Set(refs.map((entry: unknown) => entry && typeof entry === 'object' ? String((entry as Record<string, unknown>).id ?? '') : '').filter(Boolean))
}

export const createPossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  const op = operationId(data?.operationId)
  const question = boundedQuestion(data?.question)
  const originRealm = String(data?.originRealm ?? 'home')
  if (!ALLOWED_ORIGINS.has(originRealm)) throw new functions.https.HttpsError('invalid-argument', 'Invalid origin realm.')
  const evidenceRefs = Array.isArray(data?.evidenceRefs) ? data.evidenceRefs.slice(0, 128) : []
  const assumptionOnly = data?.assumptionOnly === true
  if (!evidenceRefs.length && !assumptionOnly) {
    throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_REQUIRES_AUTHORIZED_EVIDENCE_OR_EXPLICIT_ASSUMPTION_ONLY')
  }
  const scenarioId = opaque('scn_')
  const basisId = opaque('basis_')
  const returnToken = String(data?.returnToken ?? opaque('return_')).slice(0, 120)
  const excludedEvidence = Array.isArray(data?.excludedEvidence) ? data.excludedEvidence.slice(0, 128) : []
  const permissionReceiptIds = asStringArray(data?.permissionReceiptIds)
  const now = fv.serverTimestamp()
  const ref = scenarioRef(ownerId, scenarioId)
  const receiptId = stableReceipt(ownerId, op, 'scenario-create')
  await db.runTransaction(async (tx) => {
    const receiptRef = db.doc(`users/${ownerId}/privacyReceipts/${receiptId}`)
    const existing = await tx.get(receiptRef)
    if (existing.exists) throw new functions.https.HttpsError('already-exists', 'Operation already completed.', { receiptId })
    tx.create(ref, {
      schemaVersion: 1, id: scenarioId, ownerId, question, status: 'awaiting-assumptions', originRealm,
      returnToken, cameraCheckpoint: typeof data?.cameraCheckpoint === 'string' ? data.cameraCheckpoint : null,
      basisId, basisRevision: 1, assumptionOnly, timeHorizon: data?.timeHorizon ?? { amount: 1, unit: 'month' },
      branchIds: [], consentSnapshotIds: permissionReceiptIds, receiptIds: [receiptId], purpose: SCENARIO_PURPOSE,
      truthKind: 'scenario', createdAt: now, updatedAt: now,
    })
    tx.create(ref.collection('basis').doc('current'), {
      schemaVersion: 1, id: basisId, ownerId, revision: 1, worldRevision: String(data?.worldRevision ?? 'unknown'),
      capturedAt: now, evidenceRefs, excludedEvidence, permissionReceiptIds, assumptionOnly, immutable: true,
    })
    tx.create(receiptRef, { receiptId, ownerId, kind: 'scenario-create', domain: 'possible-futures', purpose: SCENARIO_PURPOSE, scenarioId, operationId: op, assumptionOnly, result: 'created', createdAt: now, updatedAt: now })
  })
  return { scenarioId, basisId, basisRevision: 1, status: 'awaiting-assumptions', assumptionOnly, receiptId }
})

export const generatePossibleFutureBranches = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  const op = operationId(data?.operationId)
  const scenarioId = ensureScenarioId(data?.scenarioId)
  const ref = scenarioRef(ownerId, scenarioId)
  const [snapshot, basisSnapshot] = await Promise.all([ref.get(), ref.collection('basis').doc('current').get()])
  if (!snapshot.exists || !basisSnapshot.exists) throw new functions.https.HttpsError('not-found', 'Scenario basis not found.')
  const scenario = snapshot.data() ?? {}
  if (Number(data?.expectedRevision) !== Number(scenario.basisRevision)) throw new functions.https.HttpsError('aborted', 'SCENARIO_BASIS_REVISION_CONFLICT')
  const allowedEvidence = evidenceIdsFromBasis(basisSnapshot.data())
  const manualBranches = Array.isArray(data?.manualBranches) ? data.manualBranches.slice(0, BRANCH_LIMIT) : []
  if (!manualBranches.length) {
    const receiptId = stableReceipt(ownerId, op, 'scenario-provider-unavailable')
    await Promise.all([
      ref.set({ status: 'awaiting-assumptions', updatedAt: fv.serverTimestamp() }, { merge: true }),
      db.doc(`scenarioProviderReceipts/${receiptId}`).set({ receiptId, ownerId, scenarioId, operationId: op, providerState: scenarioProviderState, validationResult: 'provider-unavailable', retryCount: 0, createdAt: fv.serverTimestamp() }),
    ])
    return { status: 'provider-unavailable', manualScenarioAvailable: true, retryCount: 0, receiptId }
  }
  const branchIds: string[] = []
  const batch = db.batch()
  manualBranches.forEach((branch: unknown, index: number) => {
    if (!branch || typeof branch !== 'object') throw new functions.https.HttpsError('invalid-argument', 'Manual branches must be objects.')
    const item = branch as Record<string, unknown>
    const evidenceRefIds = asStringArray(item.evidenceRefIds)
    for (const evidenceRefId of evidenceRefIds) {
      if (!allowedEvidence.has(evidenceRefId)) throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_BRANCH_EVIDENCE_OUTSIDE_BASIS')
    }
    const summary = String(item.summary ?? '').trim()
    if (!summary) throw new functions.https.HttpsError('invalid-argument', 'Manual branch summary is required.')
    const branchId = opaque('br_')
    branchIds.push(branchId)
    batch.create(ref.collection('branches').doc(branchId), {
      id: branchId, ownerId, scenarioId, truthKind: 'scenario', label: String(item.label ?? `Branch ${index + 1}`).slice(0, 80),
      summary: summary.slice(0, 4000), assumptionIds: asStringArray(item.assumptionIds), evidenceRefIds,
      uncertainty: asStringArray(item.uncertainty), source: 'manual-scenario', createdAt: fv.serverTimestamp(), updatedAt: fv.serverTimestamp(),
    })
  })
  batch.set(ref, { status: 'ready', branchIds, activeBranchId: branchIds[0], updatedAt: fv.serverTimestamp() }, { merge: true })
  await batch.commit()
  return { status: 'ready', branchIds, source: 'manual-scenario' }
})

export const getPossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  const scenarioId = ensureScenarioId(data?.scenarioId)
  const ref = scenarioRef(ownerId, scenarioId)
  const [scenario, basis, branches] = await Promise.all([ref.get(), ref.collection('basis').doc('current').get(), ref.collection('branches').limit(BRANCH_LIMIT).get()])
  if (!scenario.exists) throw new functions.https.HttpsError('not-found', 'Scenario not found.')
  return { scenario: scenario.data(), basis: basis.exists ? basis.data() : null, branches: branches.docs.map((doc) => doc.data()) }
})

export const savePossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context); operationId(data?.operationId); const scenarioId = ensureScenarioId(data?.scenarioId)
  await scenarioRef(ownerId, scenarioId).set({ status: 'saved', updatedAt: fv.serverTimestamp() }, { merge: true })
  return { scenarioId, status: 'saved' }
})

export const discardPossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context); operationId(data?.operationId); const scenarioId = ensureScenarioId(data?.scenarioId)
  await scenarioRef(ownerId, scenarioId).set({ status: 'discarded', updatedAt: fv.serverTimestamp() }, { merge: true })
  return { scenarioId, status: 'discarded' }
})

export const comparePossibleFutureBranches = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context); const op = operationId(data?.operationId); const scenarioId = ensureScenarioId(data?.scenarioId)
  const branchIds = asStringArray(data?.branchIds, 3)
  if (branchIds.length < 2) throw new functions.https.HttpsError('invalid-argument', 'At least two branches are required.')
  const ref = scenarioRef(ownerId, scenarioId)
  const docs = await Promise.all(branchIds.map((branchId) => ref.collection('branches').doc(branchId).get()))
  if (docs.some((doc) => !doc.exists)) throw new functions.https.HttpsError('not-found', 'Branch not found.')
  const comparisonId = opaque('cmp_')
  const comparison = { id: comparisonId, scenarioId, ownerId, branchIds, branches: docs.map((doc) => doc.data()), winner: null, operationId: op, createdAt: fv.serverTimestamp() }
  await ref.collection('comparisons').doc(comparisonId).create(comparison)
  return { comparisonId, branchIds, winner: null }
})

export const recordPossibleFutureOutcome = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context); operationId(data?.operationId); const scenarioId = ensureScenarioId(data?.scenarioId)
  const source = String(data?.source ?? '')
  if (source !== 'observation' && source !== 'user-assertion') throw new functions.https.HttpsError('invalid-argument', 'Outcome requires an independent observation or user assertion.')
  const observedTruthRecordIds = asStringArray(data?.observedTruthRecordIds)
  if (!observedTruthRecordIds.length) throw new functions.https.HttpsError('invalid-argument', 'Outcome requires independent truth record references.')
  const observationId = opaque('obs_')
  await scenarioRef(ownerId, scenarioId).collection('outcomeObservations').doc(observationId).create({ id: observationId, ownerId, scenarioId, branchId: typeof data?.branchId === 'string' ? data.branchId : null, source, observedTruthRecordIds, observedAt: fv.serverTimestamp(), createdAt: fv.serverTimestamp() })
  return { observationId, scenarioId }
})

export const deletePossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context); operationId(data?.operationId); const scenarioId = ensureScenarioId(data?.scenarioId)
  const ref = scenarioRef(ownerId, scenarioId)
  const snapshot = await ref.get()
  if (!snapshot.exists) return { scenarioId, deleted: true }
  await db.recursiveDelete(ref)
  return { scenarioId, deleted: true }
})
