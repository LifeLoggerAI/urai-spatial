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
  await db.doc(`users/${ownerId}/aiLedger/${entryId}`).create({ ...entry, createdAt: admin.firestore.FieldValue.serverTimestamp() })
  return entryId
}

export const getAILedgerEntries = functions.https.onCall(async (data, context) => {
  const ownerId = requireUid(context)
  const max = Math.max(1, Math.min(50, Number(data?.limit ?? 25)))
  const snapshot = await db.collection(`users/${ownerId}/aiLedger`).orderBy('createdAt', 'desc').limit(max).get()
  return { entries: snapshot.docs.map((doc) => doc.data()) }
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
  await writeAILedgerEntry(ownerId, {
    schemaVersion: 1, entryId, ownerId, operationId: `outcome-${observationId}`, kind: 'outcome-observation', truthKind: 'observation', scenarioId,
    timestamp: new Date().toISOString(), evidenceRefs: Array.isArray(data.observedTruthRecordIds) ? data.observedTruthRecordIds : [], excludedRefs: [], exclusionReasons: [], permissionSnapshotRefs: [],
    outputRecordRef: snapshot.ref.path, support: 'medium', uncertainties: [], alternativeIds: [], outcomeObservationId: observationId, inputHash: hash(data.observedTruthRecordIds), outputHash: hash({ observationId, source: data.source }),
  })
})
