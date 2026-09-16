import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const FORBIDDEN_KEYS = new Set(['chainOfThought','chain_of_thought','hiddenReasoning','hidden_reasoning','reasoningTokens','reasoning_tokens'])

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

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
