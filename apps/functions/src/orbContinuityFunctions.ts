import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { randomUUID } from 'node:crypto'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 2000
const MAX_SEED_BYTES = 24_000

type OrbMessage = { role: 'user' | 'assistant'; content: string }
type StoredMessage = OrbMessage & { source: 'conversation-not-historical-evidence' }
type StoredContinuity = {
  version: 1
  ownerId: string
  enabled: true
  epoch: string
  revision: number
  messages: StoredMessage[]
  recentTurnIds: string[]
}

function invalid(message: string): never {
  throw new functions.https.HttpsError('invalid-argument', message)
}
function denied(): never {
  throw new functions.https.HttpsError('permission-denied', 'Current owner and memory permission are required.')
}
function uidOf(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in to use private Orb continuity.')
  }
  return uid
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function messageList(value: unknown, seed = false): StoredMessage[] {
  if (!Array.isArray(value) || value.length > MAX_MESSAGES) invalid('Invalid bounded conversation history.')
  if (seed && Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_SEED_BYTES) invalid('Conversation history is too large.')
  return value.map((item: unknown) => {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'assistant')
      || typeof item.content !== 'string' || !item.content.trim()
      || item.content.length > MAX_MESSAGE_LENGTH) invalid('Invalid conversation message.')
    return { role: item.role as 'user' | 'assistant', content: item.content,
      source: 'conversation-not-historical-evidence' as const }
  })
}
function continuityOf(value: unknown, uid: string): StoredContinuity {
  if (!isRecord(value) || value.version !== 1 || value.ownerId !== uid || value.enabled !== true
    || typeof value.epoch !== 'string' || !/^[a-f0-9-]{36}$/.test(value.epoch)
    || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1
    || !Array.isArray(value.recentTurnIds) || value.recentTurnIds.length > 20
    || value.recentTurnIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{8,96}$/.test(id))) {
    throw new functions.https.HttpsError('failed-precondition', 'Stored Orb continuity is invalid.')
  }
  return { version: 1, ownerId: uid, enabled: true, epoch: value.epoch as string,
    revision: value.revision as number, messages: messageList(value.messages),
    recentTurnIds: value.recentTurnIds as string[] }
}
function publicState(state: StoredContinuity | null) {
  return state ? { enabled: true, epoch: state.epoch, revision: state.revision,
    messages: state.messages.map(({ role, content }) => ({ role, content })) }
    : { enabled: false, epoch: null, revision: 0, messages: [] as OrbMessage[] }
}
function memoryReady(
  uid: string,
  owner: FirebaseFirestore.DocumentSnapshot,
  policyDoc: FirebaseFirestore.DocumentSnapshot,
  fence: FirebaseFirestore.DocumentSnapshot,
  tombstone: FirebaseFirestore.DocumentSnapshot,
) {
  const policy = policyDoc.data()
  if (!owner.exists || owner.get('deleted') === true
    || ['deleting', 'deleted', 'disabled'].includes(String(owner.get('accountStatus') ?? ''))
    || tombstone.exists || !policyDoc.exists || !isCanonicalStoredPolicy(policy, uid)
    || policy.domains.memory.mode !== 'granted'
    || policy.enforcement.state !== 'fully-enforced') denied()
  if (typeof owner.get('privacyRevision') === 'number'
    && owner.get('privacyRevision') !== policy.revision) denied()
  if (fence.exists) {
    const pending = fence.get('pendingDeletions')
    if (!isRecord(pending) || Object.keys(pending).some(key => pending[key] === true)) denied()
  }
}
function actionOf(data: unknown) {
  if (!isRecord(data) || typeof data.action !== 'string'
    || !['read', 'enable', 'append', 'clear', 'disable'].includes(data.action)) invalid('Invalid continuity action.')
  return data as Record<string, unknown>
}

/**
 * Owner-scoped, explicitly opted-in conversation checkpoint.
 * This is not Life Graph historical evidence, a model identity, or a hidden
 * transcript collector. Cloud Functions are the only writers and readers.
 */
export const orbConversationContinuity = functions.https.onCall(async (input, context) => {
  const uid = uidOf(context)
  const body = actionOf(input)
  const action = body.action
  const ref = db.doc('users/' + uid + '/orbConversationContinuity/current')
  const ownerRef = db.doc('users/' + uid)
  const policyRef = db.doc('users/' + uid + '/privacyPolicy/current')
  const fenceRef = db.doc('users/' + uid + '/privacyRuntime/exportAuthority')
  const tombstoneRef = db.doc('privacyDeletionTombstones/' + uid)
  const seed = action === 'enable' ? messageList(body.seed ?? [], true) : []
  const epoch = action === 'enable' || action === 'clear' ? randomUUID() : ''
  const turnId = action === 'append' ? body.turnId : ''
  if (action === 'append' && (typeof turnId !== 'string' || !/^[A-Za-z0-9_-]{8,96}$/.test(turnId))) {
    invalid('Invalid conversation turn identity.')
  }
  const incoming = action === 'append'
    ? messageList([{ role: 'user', content: body.userMessage },
      { role: 'assistant', content: body.assistantMessage }], true)
    : []
  return db.runTransaction(async transaction => {
    // A disabled owner may delete a prior checkpoint even after memory consent
    // has been revoked; no read access to the old messages is granted.
    if (action === 'disable') {
      transaction.delete(ref)
      return publicState(null)
    }
    const [owner, policy, fence, tombstone, existing] = await Promise.all([
      transaction.get(ownerRef), transaction.get(policyRef), transaction.get(fenceRef),
      transaction.get(tombstoneRef), transaction.get(ref),
    ])
    memoryReady(uid, owner, policy, fence, tombstone)
    const state = existing.exists ? continuityOf(existing.data(), uid) : null
    if (action === 'read') return publicState(state)
    if (action === 'enable') {
      if (state) return publicState(state)
      const created: StoredContinuity = { version: 1, ownerId: uid,
        enabled: true, epoch, revision: 1, messages: seed, recentTurnIds: [] }
      transaction.set(ref, { ...created, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      return publicState(created)
    }
    if (!state) denied()
    if (action === 'clear') {
      const cleared: StoredContinuity = { ...state, epoch, revision: state.revision + 1,
        messages: [], recentTurnIds: [] }
      transaction.set(ref, { ...cleared, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      return publicState(cleared)
    }
    if (typeof body.epoch !== 'string' || body.epoch !== state.epoch) denied()
    if (state.recentTurnIds.includes(turnId as string)) return publicState(state)
    if (state.revision >= Number.MAX_SAFE_INTEGER) {
      throw new functions.https.HttpsError('resource-exhausted', 'Conversation revision limit reached.')
    }
    const next: StoredContinuity = { ...state, revision: state.revision + 1,
      messages: [...state.messages, ...incoming].slice(-MAX_MESSAGES),
      recentTurnIds: [...state.recentTurnIds, turnId as string].slice(-20) }
    transaction.set(ref, { ...next, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
    return publicState(next)
  }, { maxAttempts: 5 })
})
