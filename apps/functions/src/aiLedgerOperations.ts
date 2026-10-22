import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const FORBIDDEN_KEYS = new Set(['chainOfThought','chain_of_thought','hiddenReasoning','hidden_reasoning','reasoningTokens','reasoning_tokens'])

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}
function safeId(value: string) { return value.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 90) }
function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex') }

export async function writeAILedgerEntry(ownerId: string, entry: Record<string, unknown>) {
  for (const key of Object.keys(entry)) if (FORBIDDEN_KEYS.has(key)) throw new Error(`AI_LEDGER_HIDDEN_REASONING_FORBIDDEN:${key}`)
  const entryId = String(entry.entryId ?? '')
  if (!/^ai_[A-Za-z0-9_-]{12,96}$/.test(entryId)) throw new Error('AI_LEDGER_ENTRY_ID_INVALID')
  if (entry.ownerId !== ownerId) throw new Error('AI_LEDGER_OWNER_MISMATCH')
  if (entry.provider && (!entry.model || !entry.modelVersion)) throw new Error('AI_LEDGER_PROVIDER_REQUIRES_EXACT_MODEL_VERSION')
  const entryRef = db.doc(`users/${ownerId}/aiLedger/${entryId}`)
  await db.runTransaction(async tx => {
    // Firestore triggers may arrive after account or Scenario deletion. Read
    // authority and the original event's Scenario before creating any ledger row.
    const scenarioId = typeof entry.scenarioId === 'string' ? entry.scenarioId : ''
    if (!/^scn_[A-Za-z0-9_-]{12,96}$/.test(scenarioId)) throw new Error('AI_LEDGER_SCENARIO_ID_INVALID')
    const [owner, fence, tombstone, scenario, existing] = await Promise.all([
      tx.get(db.doc(`users/${ownerId}`)),
      tx.get(db.doc(`users/${ownerId}/privacyRuntime/exportAuthority`)),
      tx.get(db.doc(`privacyDeletionTombstones/${ownerId}`)),
      tx.get(db.doc(`users/${ownerId}/scenarios/${scenarioId}`)),
      tx.get(entryRef),
    ])
    if (!owner.exists || owner.get('deleted') === true
      || ['deleting', 'deleted', 'disabled'].includes(String(owner.get('accountStatus') ?? ''))
      || tombstone.exists || !scenario.exists || scenario.get('ownerId') !== ownerId
      || scenario.get('status') === 'discarded') return
    const pending = fence.exists ? fence.get('pendingDeletions') : {}
    if (!pending || typeof pending !== 'object' || Array.isArray(pending)
      || Object.values(pending as Record<string, unknown>).some(value => value === true)) return
    // The trigger is at-least-once. Duplicate deliveries must be idempotent.
    if (!existing.exists) tx.create(entryRef, { ...entry, createdAt: admin.firestore.FieldValue.serverTimestamp() })
  })
  return entryId
}

export const getAILedgerEntries = functions.https.onCall(async (data, context) => {
  const ownerId = requireUid(context)
  const max = Math.max(1, Math.min(50, Number(data?.limit ?? 25)))
  return db.runTransaction(async tx => {
    const [owner, fence, tombstone] = await Promise.all([
      tx.get(db.doc(`users/${ownerId}`)),
      tx.get(db.doc(`users/${ownerId}/privacyRuntime/exportAuthority`)),
      tx.get(db.doc(`privacyDeletionTombstones/${ownerId}`)),
    ])
    const pending = fence.exists ? fence.get('pendingDeletions') : {}
    if (!owner.exists || owner.get('deleted') === true
      || ['deleting', 'deleted', 'disabled'].includes(String(owner.get('accountStatus') ?? ''))
      || tombstone.exists || !pending || typeof pending !== 'object' || Array.isArray(pending)
      || Object.values(pending as Record<string, unknown>).some(value => value === true)) {
      throw new functions.https.HttpsError('permission-denied', 'Current owner authority is required.')
    }
    const snapshot = await tx.get(db.collection(`users/${ownerId}/aiLedger`).orderBy('createdAt', 'desc').limit(max))
    return { entries: snapshot.docs.map(doc => doc.data()) }
  })
})

/** Trusted receipts generated from externally observable Scenario state only. */
export const ledgerScenarioCreated = functions.firestore.document('users/{uid}/scenarios/{scenarioId}').onCreate(async (snapshot, context) => {
  const ownerId = context.params.uid
  const scenarioId = context.params.scenarioId
  const data = snapshot.data()
  const entryId = `ai_${safeId(`scenario-created-${scenarioId}`)}`
  await writeAILedgerEntry(ownerId, {
    schemaVersion: 1, entryId, ownerId, operationId: `scenario-create-${scenarioId}`, kind: 'proposal', truthKind: 'scenario', scenarioId,
    timestamp: new Date().toISOString(), evidenceRefs: [], excludedRefs: [], exclusionReasons: [], permissionSnapshotRefs: Array.isArray(data.consentSnapshotIds) ? data.consentSnapshotIds : [],
    outputRecordRef: snapshot.ref.path, support: data.assumptionOnly ? 'low' : 'medium', uncertainties: [], alternativeIds: [], inputHash: hash({ question: data.question, basisId: data.basisId }), outputHash: hash({ scenarioId, status: data.status }),
  })
})

export const ledgerScenarioOutcomeObserved = functions.firestore.document('users/{uid}/scenarios/{scenarioId}/outcomeObservations/{observationId}').onCreate(async (snapshot, context) => {
  const ownerId = context.params.uid
  const scenarioId = context.params.scenarioId
  const observationId = context.params.observationId
  const data = snapshot.data()
  const entryId = `ai_${safeId(`outcome-observed-${observationId}`)}`
  const verified = data.source === 'observation' && data.verification === 'independently-verified'
  await writeAILedgerEntry(ownerId, {
    schemaVersion: 1, entryId, ownerId, operationId: `outcome-${observationId}`,
    kind: verified ? 'outcome-observation' : 'outcome-report',
    truthKind: verified ? 'observation' : 'user-assertion', scenarioId,
    timestamp: new Date().toISOString(),
    // Unverified owner reports are not evidence of independently observed reality.
    evidenceRefs: verified && Array.isArray(data.observedTruthRecordIds) ? data.observedTruthRecordIds : [],
    excludedRefs: [], exclusionReasons: [], permissionSnapshotRefs: [],
    outputRecordRef: snapshot.ref.path, support: verified ? 'medium' : 'low',
    uncertainties: verified ? [] : ['Owner-reported outcome; not independently verified'],
    alternativeIds: [], outcomeObservationId: observationId,
    inputHash: hash({ requestDigest: data.requestDigest, source: data.source }),
    outputHash: hash({ observationId, source: data.source, verified }),
  })
})
