import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash, randomUUID } from 'node:crypto'
import { scenarioProviderState } from './scenarioProvider'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const fv = admin.firestore.FieldValue

const BRANCH_LIMIT = 3
const SCENARIO_PURPOSE = 'scenario.explore'
const ALLOWED_ORIGINS = new Set(['home','ground','life-map','focus','replay','passport','mirror','shadow','council','privacy-controls','location-map','life-movie','possible-futures'])

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

type ScenarioSourceContext = {
  memoryId?: string
  personId?: string
  placeId?: string
}

function safeContextId(value: unknown) {
  const id = String(value ?? '').trim()
  return /^[A-Za-z0-9:_-]{1,160}$/.test(id) ? id : ''
}

async function resolveAuthorizedScenarioEvidence(ownerId: string, value: unknown, transaction: FirebaseFirestore.Transaction) {
  const context = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const memoryId = safeContextId(context.memoryId)
  const personId = safeContextId(context.personId)
  const placeId = safeContextId(context.placeId)
  if (!memoryId && !personId && !placeId) return { evidenceRefs: [], permissionReceiptIds: [] as string[] }

  const policySnapshot = await transaction.get(db.doc(`users/${ownerId}/privacyPolicy/current`))
  if (!policySnapshot.exists) return { evidenceRefs: [], permissionReceiptIds: [] as string[] }
  const policy = policySnapshot.data()
  if (!isCanonicalStoredPolicy(policy, ownerId)) return { evidenceRefs: [], permissionReceiptIds: [] as string[] }
  const domains = policy.domains
  const enforcement = policy.enforcement
  const memoryPolicy = domains.memory
  const modelPolicy = domains.models
  if (enforcement.state !== 'fully-enforced') return { evidenceRefs: [], permissionReceiptIds: [] as string[] }

  const evidenceRefs: Record<string, unknown>[] = []
  const revision = policy.revision

  if (memoryId && memoryPolicy.modelContext === true && ['granted', 'limited'].includes(String(memoryPolicy.mode ?? ''))) {
    const memory = await transaction.get(db.doc(`users/${ownerId}/memories/${memoryId}`))
    const memoryRow = memory.exists ? memory.data() : null
    if (memoryRow && (memoryRow.ownerId ?? memoryRow.userId) === ownerId
      && memoryRow.deleted !== true && memoryRow.demo !== true && memoryRow.synthetic !== true
      && !['pending','revoked'].includes(String(memoryRow.consentState ?? ''))) {
      evidenceRefs.push({
        id: `evr_memory_${createHash('sha256').update(memoryId).digest('hex').slice(0, 24)}`,
        truthRecordId: `memory:${memoryId}`,
        sourceId: `users/${ownerId}/memories/${memoryId}`,
        truthKind: 'autobiographical-memory',
        purpose: SCENARIO_PURPOSE,
        sourceRevision: revision,
        transformations: ['reference-only'],
      })
    }
  }

  if (modelPolicy.modelContext === true && ['granted', 'limited'].includes(String(modelPolicy.mode ?? ''))) {
    for (const [kind, entityId] of [['person', personId], ['place', placeId]] as const) {
      if (!entityId) continue
      const entity = await transaction.get(db.doc(`users/${ownerId}/lifeEntities/${entityId}`))
      const entityRow = entity.exists ? entity.data() : null
      if (!entityRow || entityRow.ownerId !== ownerId || entityRow.kind !== kind
        || entityRow.revoked === true || entityRow.synthetic === true
        || ['superseded','revoked'].includes(String(entityRow.status ?? ''))) continue
      evidenceRefs.push({
        id: `evr_${kind}_${createHash('sha256').update(entityId).digest('hex').slice(0, 24)}`,
        truthRecordId: `life-entity:${entityId}`,
        sourceId: `users/${ownerId}/lifeEntities/${entityId}`,
        truthKind: 'interpretation',
        purpose: SCENARIO_PURPOSE,
        sourceRevision: revision,
        transformations: ['reference-only', 'life-model-entity'],
      })
    }
  }

  return { evidenceRefs, permissionReceiptIds: [] as string[] }
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
  if (Array.isArray(data?.evidenceRefs) && data.evidenceRefs.length) {
    throw new functions.https.HttpsError('permission-denied', 'CLIENT_SCENARIO_EVIDENCE_REFS_FORBIDDEN')
  }
  let assumptionOnly = false
  const scenarioId = opaque('scn_')
  const basisId = opaque('basis_')
  const returnToken = String(data?.returnToken ?? opaque('return_')).slice(0, 120)
  const excludedEvidence = Array.isArray(data?.excludedEvidence) ? data.excludedEvidence.slice(0, 128) : []
  if (Array.isArray(data?.permissionReceiptIds) && data.permissionReceiptIds.length) {
    throw new functions.https.HttpsError('permission-denied', 'CLIENT_SCENARIO_PERMISSION_RECEIPTS_FORBIDDEN')
  }
  const now = fv.serverTimestamp()
  const ref = scenarioRef(ownerId, scenarioId)
  const receiptId = stableReceipt(ownerId, op, 'scenario-create')
  await db.runTransaction(async (tx) => {
    const receiptRef = db.doc(`users/${ownerId}/privacyReceipts/${receiptId}`)
    const existing = await tx.get(receiptRef)
    if (existing.exists) throw new functions.https.HttpsError('already-exists', 'Operation already completed.', { receiptId })
    const resolvedEvidence = await resolveAuthorizedScenarioEvidence(ownerId, data?.sourceContext, tx)
    const evidenceRefs = resolvedEvidence.evidenceRefs
    const permissionReceiptIds = resolvedEvidence.permissionReceiptIds
    assumptionOnly = evidenceRefs.length === 0 ? data?.assumptionOnly === true : false
    if (!evidenceRefs.length && !assumptionOnly) {
      throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_REQUIRES_AUTHORIZED_EVIDENCE_OR_EXPLICIT_ASSUMPTION_ONLY')
    }
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
  // Do not silently truncate user-authored branches or treat malformed input
  // as a request to enter the provider-unavailable fallback.
  if (data?.manualBranches != null && !Array.isArray(data.manualBranches))
    throw new functions.https.HttpsError('invalid-argument', 'Manual branches must be an array.')
  const manualBranches = Array.isArray(data?.manualBranches) ? data.manualBranches : []
  if (manualBranches.length > BRANCH_LIMIT)
    throw new functions.https.HttpsError('invalid-argument', 'Too many manual branches.')

  // The unconfigured provider remains intentionally unavailable. Even this
  // negative/fallback path must not recreate a deleted or terminal Scenario.
  if (!manualBranches.length) {
    const receiptId = stableReceipt(ownerId, op, 'scenario-provider-unavailable')
    const receiptRef = db.doc('scenarioProviderReceipts/' + receiptId)
    await db.runTransaction(async (tx) => {
      const scenarioSnapshot = await tx.get(ref)
      const basisRef = ref.collection('basis').doc('current')
      const basisSnapshot = await tx.get(basisRef)
      if (!scenarioSnapshot.exists || !basisSnapshot.exists ||
          scenarioSnapshot.data()?.ownerId !== ownerId || basisSnapshot.data()?.ownerId !== ownerId)
        throw new functions.https.HttpsError('not-found', 'Scenario basis not found.')
      const scenario = scenarioSnapshot.data() ?? {}
      if (scenario.status === 'discarded')
        throw new functions.https.HttpsError('not-found', 'Scenario not found.')
      if (scenario.status === 'saved')
        throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_TERMINAL_STATE')
      if (Number(data?.expectedRevision) !== Number(scenario.basisRevision))
        throw new functions.https.HttpsError('aborted', 'SCENARIO_BASIS_REVISION_CONFLICT')
      const existing = await tx.get(receiptRef)
      if (!existing.exists) {
        // A ready scenario must not lose its already accepted branches merely
        // because no paid model provider is configured for a new request.
        if (scenario.status === 'awaiting-assumptions')
          tx.update(ref, { updatedAt: fv.serverTimestamp() })
        tx.create(receiptRef, { receiptId, ownerId, scenarioId, operationId: op,
          providerState: scenarioProviderState, validationResult: 'provider-unavailable',
          retryCount: 0, createdAt: fv.serverTimestamp() })
      }
    })
    return { status: 'provider-unavailable', manualScenarioAvailable: true, retryCount: 0, receiptId }
  }

  // Prepare stable, bounded branches outside the retryable Firestore callback.
  // Only authoritative stored basis IDs may be attached to these scenarios.
  const branchIds: string[] = []
  const branches = manualBranches.map((branch: unknown, index: number) => {
    if (!branch || typeof branch !== 'object' || Array.isArray(branch))
      throw new functions.https.HttpsError('invalid-argument', 'Manual branches must be objects.')
    const item = branch as Record<string, unknown>
    const summary = String(item.summary ?? '').trim()
    if (!summary) throw new functions.https.HttpsError('invalid-argument', 'Manual branch summary is required.')
    if (item.evidenceRefIds !== undefined && (!Array.isArray(item.evidenceRefIds) ||
        item.evidenceRefIds.some((id: unknown) => typeof id !== 'string' || !id)))
      throw new functions.https.HttpsError('invalid-argument', 'Evidence references must be valid IDs.')
    const evidenceRefIds = asStringArray(item.evidenceRefIds)
    const id = opaque('br_')
    branchIds.push(id)
    return { id, ownerId, scenarioId, truthKind: 'scenario',
      label: String(item.label ?? 'Branch ' + (index + 1)).slice(0, 80),
      summary: summary.slice(0, 4000), assumptionIds: asStringArray(item.assumptionIds),
      evidenceRefIds, uncertainty: asStringArray(item.uncertainty), source: 'manual-scenario',
      createdAt: fv.serverTimestamp(), updatedAt: fv.serverTimestamp() }
  })
  await db.runTransaction(async (tx) => {
    const basisRef = ref.collection('basis').doc('current')
    const [snapshot, basisSnapshot] = await Promise.all([tx.get(ref), tx.get(basisRef)])
    if (!snapshot.exists || !basisSnapshot.exists ||
        snapshot.data()?.ownerId !== ownerId || basisSnapshot.data()?.ownerId !== ownerId)
      throw new functions.https.HttpsError('not-found', 'Scenario basis not found.')
    const scenario = snapshot.data() ?? {}
    if (scenario.status === 'discarded')
      throw new functions.https.HttpsError('not-found', 'Scenario not found.')
    if (scenario.status === 'saved')
      throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_TERMINAL_STATE')
    if (Number(data?.expectedRevision) !== Number(scenario.basisRevision))
      throw new functions.https.HttpsError('aborted', 'SCENARIO_BASIS_REVISION_CONFLICT')
    const allowedEvidence = evidenceIdsFromBasis(basisSnapshot.data())
    for (const branch of branches) {
      for (const evidenceRefId of branch.evidenceRefIds) {
        if (!allowedEvidence.has(evidenceRefId))
          throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_BRANCH_EVIDENCE_OUTSIDE_BASIS')
      }
    }
    for (const branch of branches)
      tx.create(ref.collection('branches').doc(branch.id), branch)
    tx.update(ref, { status: 'ready', branchIds, activeBranchId: branchIds[0],
      updatedAt: fv.serverTimestamp() })
  })
  return { status: 'ready', branchIds, source: 'manual-scenario' }
})
export const getPossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  const scenarioId = ensureScenarioId(data?.scenarioId)
  const ref = scenarioRef(ownerId, scenarioId)
  const scenario = await ref.get()
  if (!scenario.exists || scenario.data()?.ownerId !== ownerId || scenario.data()?.status === 'discarded')
    throw new functions.https.HttpsError('not-found', 'Scenario not found.')
  // Only the current scenario-owned branch IDs are eligible. A collection
  // scan can surface abandoned branches from an interrupted or superseded run.
  const branchIds = asStringArray(scenario.data()?.branchIds, BRANCH_LIMIT)
  if (branchIds.some((id) => !safeContextId(id)))
    throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_ACTIVE_BRANCH_ID_INVALID')
  const [basis, branches] = await Promise.all([
    ref.collection('basis').doc('current').get(),
    Promise.all(branchIds.map((id) => ref.collection('branches').doc(id).get())),
  ])
  if (branches.some((doc) => !doc.exists || doc.data()?.ownerId !== ownerId))
    throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_ACTIVE_BRANCH_MISSING')
  return {
    scenario: scenario.data(),
    basis: basis.exists ? basis.data() : null,
    branches: branches.map((doc) => doc.data()),
  }
})

export const getPossibleFutureCouncilBundle = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  const scenarioId = ensureScenarioId(data?.scenarioId)
  const requestedBranchId = safeContextId(data?.branchId)
  if (data?.branchId !== undefined && (typeof data.branchId !== 'string' || !requestedBranchId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid Scenario branch ID.')
  }
  const ref = scenarioRef(ownerId, scenarioId)
  const scenarioSnap = await ref.get()
  if (!scenarioSnap.exists || scenarioSnap.data()?.ownerId !== ownerId)
    throw new functions.https.HttpsError('not-found', 'Scenario not found.')
  const scenario = scenarioSnap.data() ?? {}
  // A discarded future is not eligible to reappear as an active Council scene.
  if (scenario.status === 'discarded')
    throw new functions.https.HttpsError('not-found', 'Scenario not found.')
  const branchIds = asStringArray(scenario.branchIds, BRANCH_LIMIT)
  if (branchIds.some((id) => !safeContextId(id)))
    throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_ACTIVE_BRANCH_ID_INVALID')
  if (requestedBranchId && !branchIds.includes(requestedBranchId))
    throw new functions.https.HttpsError('not-found', 'Scenario branch not found.')
  const [basisSnap, branchSnapshots] = await Promise.all([
    ref.collection('basis').doc('current').get(),
    Promise.all(branchIds.map((id) => ref.collection('branches').doc(id).get())),
  ])
  if (!basisSnap.exists) throw new functions.https.HttpsError('not-found', 'Scenario not found.')
  if (branchSnapshots.some((doc) => !doc.exists || doc.data()?.ownerId !== ownerId))
    throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_ACTIVE_BRANCH_MISSING')
  const activeBranchId = requestedBranchId || String(scenario.activeBranchId ?? '')
  const activeIndex = branchIds.indexOf(activeBranchId)
  if (branchIds.length && activeIndex < 0)
    throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_ACTIVE_BRANCH_NOT_CURRENT')
  const branch = activeIndex >= 0 ? branchSnapshots[activeIndex] : null
  const basis = basisSnap.data() ?? {}
  const evidenceRefs = Array.isArray(basis.evidenceRefs) ? basis.evidenceRefs : []
  const evidenceKinds = [...new Set(evidenceRefs.map((entry: unknown) =>
    entry && typeof entry === 'object' ? String((entry as Record<string, unknown>).truthKind ?? 'unknown') : 'unknown'
  ))].slice(0, 8)
  const branchData = branch?.data() ?? {}
  return {
    scenarioId,
    branchId: branch?.id ?? null,
    truthKind: 'scenario',
    question: String(scenario.question ?? '').slice(0, 1200),
    branchLabel: String(branchData.label ?? 'Scenario branch').slice(0, 80),
    branchSummary: String(branchData.summary ?? '').slice(0, 1600),
    uncertainty: asStringArray(branchData.uncertainty, 16),
    assumptionOnly: basis.assumptionOnly === true,
    evidenceCount: evidenceRefs.length,
    evidenceKinds,
    disclosure: 'Possible Future only. Not a memory, prediction, consensus, or authority decision.',
  }
})

export const savePossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context); operationId(data?.operationId); const scenarioId = ensureScenarioId(data?.scenarioId)
  const ref = scenarioRef(ownerId, scenarioId)
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref)
    const current = snapshot.exists ? snapshot.data() : null
    if (!current || current.ownerId !== ownerId || current.status === 'discarded') {
      throw new functions.https.HttpsError('not-found', 'Scenario not found.')
    }
    tx.update(ref, { status: 'saved', updatedAt: fv.serverTimestamp() })
  })
  return { scenarioId, status: 'saved' }
})

export const discardPossibleFuture = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  operationId(data?.operationId)
  const scenarioId = ensureScenarioId(data?.scenarioId)
  const ref = scenarioRef(ownerId, scenarioId)
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref)
    if (!snapshot.exists || snapshot.data()?.ownerId !== ownerId)
      throw new functions.https.HttpsError('not-found', 'Scenario not found.')
    if (snapshot.data()?.status !== 'discarded')
      tx.update(ref, { status: 'discarded', updatedAt: fv.serverTimestamp() })
  })
  return { scenarioId, status: 'discarded' }
})
export const comparePossibleFutureBranches = functions.https.onCall(async (data, context) => {
  const ownerId = uid(context)
  const op = operationId(data?.operationId)
  const scenarioId = ensureScenarioId(data?.scenarioId)
  const requested = data?.branchIds
  if (!Array.isArray(requested) || requested.length < 2 || requested.length > BRANCH_LIMIT ||
      requested.some((id: unknown) => typeof id !== 'string' || !safeContextId(id)) ||
      new Set(requested).size !== requested.length)
    throw new functions.https.HttpsError('invalid-argument', 'Two or three distinct valid branch IDs are required.')
  const branchIds = asStringArray(requested, BRANCH_LIMIT)
  const ref = scenarioRef(ownerId, scenarioId)
  const comparisonId = opaque('cmp_')
  const comparisonRef = ref.collection('comparisons').doc(comparisonId)
  // Check active membership and write the comparison in ONE Firestore
  // transaction. A concurrent discard/regeneration must trigger revalidation,
  // never commit a stale or foreign-owner branch comparison.
  await db.runTransaction(async (tx) => {
    const scenarioSnap = await tx.get(ref)
    const scenario = scenarioSnap.exists ? scenarioSnap.data() : null
    if (!scenario || scenario.ownerId !== ownerId || scenario.status === 'discarded')
      throw new functions.https.HttpsError('not-found', 'Scenario not found.')
    const activeIds = asStringArray(scenario.branchIds, BRANCH_LIMIT)
    if (activeIds.some((id) => !safeContextId(id)))
      throw new functions.https.HttpsError('failed-precondition', 'SCENARIO_ACTIVE_BRANCH_ID_INVALID')
    if (branchIds.some((id) => !activeIds.includes(id)))
      throw new functions.https.HttpsError('not-found', 'Branch not found.')
    const docs = await Promise.all(branchIds.map((id) => tx.get(ref.collection('branches').doc(id))))
    if (docs.some((doc) => !doc.exists || doc.data()?.ownerId !== ownerId))
      throw new functions.https.HttpsError('not-found', 'Branch not found.')
    tx.create(comparisonRef, {
      id: comparisonId, scenarioId, ownerId, branchIds,
      branches: docs.map((doc) => doc.data()), winner: null, operationId: op,
      createdAt: fv.serverTimestamp(),
    })
  })
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

