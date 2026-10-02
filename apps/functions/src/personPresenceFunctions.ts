import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { randomUUID } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const personPresenceFunctions = functions.region('us-central1')
const MODES = new Set(['HISTORICAL_AS_OF','ARCHIVE_PRESENT','SIMULATION_PRESENT'])
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,160}$/

type JsonMap = Record<string, unknown>

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireToken(value: unknown, label: string) {
  const token = String(value ?? '').trim()
  if (!SAFE_TOKEN.test(token)) throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  return token
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function requirePresenceConsent(uid: string) {
  const snapshot = await db.doc(`users/${uid}/privacyPolicy/current`).get()
  if (!snapshot.exists) throw new functions.https.HttpsError('failed-precondition', 'CONSENT_POLICY_REQUIRED')
  const policy = snapshot.data() ?? {}
  const domains = isRecord(policy.domains) ? policy.domains : {}
  const models = isRecord(domains.models) ? domains.models : {}
  const identity = isRecord(domains.identity) ? domains.identity : {}
  const enforcement = isRecord(policy.enforcement) ? policy.enforcement : {}
  if (!['granted','limited'].includes(String(models.mode ?? '')) || models.modelContext !== true) {
    throw new functions.https.HttpsError('permission-denied', 'MODEL_CONTEXT_NOT_AUTHORIZED')
  }
  if (!['granted','limited'].includes(String(identity.mode ?? ''))) {
    throw new functions.https.HttpsError('permission-denied', 'IDENTITY_MODEL_NOT_AUTHORIZED')
  }
  if (enforcement.state !== 'fully-enforced') {
    throw new functions.https.HttpsError('failed-precondition', 'CONSENT_ENFORCEMENT_PENDING')
  }
}

export const preparePersonPresenceSession = personPresenceFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  if (data?.interactivePresenceConsent !== true) {
    throw new functions.https.HttpsError('permission-denied', 'INTERACTIVE_PRESENCE_CONSENT_REQUIRED')
  }
  await requirePresenceConsent(uid)

  const bundleId = requireToken(data?.bundleId, 'bundleId')
  const mode = String(data?.mode ?? '')
  if (!MODES.has(mode)) throw new functions.https.HttpsError('invalid-argument', 'Presence mode is invalid.')

  const bundle = await db.doc(`users/${uid}/personModelBundles/${bundleId}`).get()
  if (!bundle.exists || bundle.get('ownerId') !== uid || bundle.get('state') !== 'current' || bundle.get('synthetic') !== false) {
    throw new functions.https.HttpsError('failed-precondition', 'Person model bundle is unavailable.')
  }
  if (bundle.get('schemaVersion') !== 'urai-life-model-v1') {
    throw new functions.https.HttpsError('failed-precondition', 'Person model schema is incompatible.')
  }

  const personId = requireToken(bundle.get('personId'), 'personId')
  const person = await db.doc(`users/${uid}/lifeEntities/${personId}`).get()
  if (!person.exists || person.get('ownerId') !== uid || person.get('kind') !== 'person' || person.get('revoked') === true) {
    throw new functions.https.HttpsError('failed-precondition', 'Person authority is unavailable.')
  }

  const knowledgeCutoff = typeof bundle.get('knowledgeCutoff') === 'string' ? bundle.get('knowledgeCutoff') : null
  if (mode === 'HISTORICAL_AS_OF' && !knowledgeCutoff) {
    throw new functions.https.HttpsError('failed-precondition', 'Historical presence requires a knowledge cutoff.')
  }

  const sessionId = `presence:${randomUUID()}`
  await db.doc(`users/${uid}/simulationSessions/${sessionId}`).set({
    id: sessionId,
    ownerId: uid,
    personId,
    bundleId,
    mode,
    knowledgeCutoff: mode === 'HISTORICAL_AS_OF' ? knowledgeCutoff : null,
    presentationClass: 'SIMULATED',
    state: 'active',
    syntheticOutputMayBecomeHistoricalSource: false,
    historicalSourceAuthority: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return {
    sessionId,
    personId,
    bundleId,
    mode,
    knowledgeCutoff: mode === 'HISTORICAL_AS_OF' ? knowledgeCutoff : null,
    presentationClass: 'SIMULATED',
    historicalSourceAuthority: false,
    syntheticOutputMayBecomeHistoricalSource: false,
  }
})

export const closePersonPresenceSession = personPresenceFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const sessionId = requireToken(data?.sessionId, 'sessionId')
  const ref = db.doc(`users/${uid}/simulationSessions/${sessionId}`)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Presence session was not found.')
  }
  await ref.set({
    state: 'closed',
    closedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
  return { sessionId, state: 'closed' }
})
