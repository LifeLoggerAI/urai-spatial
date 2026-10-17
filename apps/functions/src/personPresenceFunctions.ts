import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash, randomUUID } from 'node:crypto'
import { preparePersonPresenceAuthority, loadPersonPresenceAuthority, requirePersonPresenceRenderBinding, type PresenceMode } from './personPresenceAuthority'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const personPresenceFunctions = functions.region('us-central1')
const fieldValue = admin.firestore.FieldValue
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


function tokenArray(value: unknown, maximum = 128) {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new functions.https.HttpsError('invalid-argument', 'Token array is invalid.')
  }
  return [...new Set(value.map((item) => requireToken(item, 'token')))]
}

function stableDigest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
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
  const sceneTruthPacketId = requireToken(data?.sceneTruthPacketId, 'sceneTruthPacketId')
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
  const authority = await preparePersonPresenceAuthority(db, uid, { bundleId, sceneTruthPacketId, mode: mode as PresenceMode })

  const sessionId = `presence:${randomUUID()}`
  await db.doc(`users/${uid}/simulationSessions/${sessionId}`).set({
    id: sessionId,
    ownerId: uid,
    personId,
    bundleId,
    sceneTruthPacketId,
    graphSnapshotId: authority.graphSnapshotId,
    bundleHash: authority.bundleHash,
    sceneTruthHash: authority.sceneTruthHash,
    graphHash: authority.graphHash,
    authorityDigest: authority.authorityDigest,
    dependencyIds: authority.dependencyIds,
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
    sceneTruthPacketId,
    authorityDigest: authority.authorityDigest,
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

export const getPersonPresenceCapabilities = personPresenceFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  await requirePresenceConsent(uid)
  const sessionId = requireToken(data?.sessionId, 'sessionId')
  const session = await db.doc(`users/${uid}/simulationSessions/${sessionId}`).get()
  if (!session.exists || session.get('ownerId') !== uid || session.get('state') !== 'active') {
    throw new functions.https.HttpsError('not-found', 'Presence session was not found.')
  }
  const bundleId = requireToken(session.get('bundleId'), 'bundleId')
  const authority = await loadPersonPresenceAuthority(db, uid, sessionId)
  const accepted = await Promise.all(['voice','visual','motion'].map((modality) => requirePersonPresenceRenderBinding(db, uid, authority, modality).then(() => true, () => false)))

  return {
    sessionId,
    bundleId,
    voice: accepted[0],
    visual: accepted[1],
    motion: accepted[2],
    providerIdentifiersExposed: false,
  }
})

function requireSha256(value: unknown, label: string) {
  const digest = String(value ?? '').trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  return digest
}

function requireAssetPromoter(context: functions.https.CallableContext) {
  if (context.auth?.token?.uraiAssetPromoter !== true) {
    throw new functions.https.HttpsError('permission-denied', 'ASSET_PROMOTER_AUTHORITY_REQUIRED')
  }
}

export const promotePersonRenderBinding = personPresenceFunctions.https.onCall(async (data, context) => {
  requireAssetPromoter(context)
  const ownerId = requireToken(data?.ownerId, 'ownerId')
  const bundleId = requireToken(data?.bundleId, 'bundleId')
  const modality = String(data?.modality ?? '')
  if (!['voice','visual','motion'].includes(modality)) throw new functions.https.HttpsError('invalid-argument', 'Render modality is invalid.')
  const provider = requireToken(data?.provider, 'provider')
  const providerResourceId = requireToken(data?.providerResourceId, 'providerResourceId')
  const providerModelId = data?.providerModelId ? requireToken(data.providerModelId, 'providerModelId') : null
  const reviewReceiptHash = requireSha256(data?.reviewReceiptHash, 'reviewReceiptHash')
  const sourceAuthorityHash = requireSha256(data?.sourceAuthorityHash, 'sourceAuthorityHash')
  const consentRefs = tokenArray(data?.consentRefs, 32)
  if (!consentRefs.length) throw new functions.https.HttpsError('failed-precondition', 'Person render binding requires consent references.')

  const [bundle, policy] = await Promise.all([
    db.doc(`users/${ownerId}/personModelBundles/${bundleId}`).get(),
    db.doc(`users/${ownerId}/privacyPolicy/current`).get(),
  ])
  if (!bundle.exists || bundle.get('ownerId') !== ownerId || bundle.get('state') !== 'current' || bundle.get('synthetic') !== false) {
    throw new functions.https.HttpsError('failed-precondition', 'Person model bundle is unavailable.')
  }
  const bundleHash = requireSha256(bundle.get('bundleHash'), 'bundleHash')
  if (sourceAuthorityHash !== bundleHash) throw new functions.https.HttpsError('failed-precondition', 'PERSON_RENDER_SOURCE_AUTHORITY_MISMATCH')
  if (!policy.exists) throw new functions.https.HttpsError('failed-precondition', 'CONSENT_POLICY_REQUIRED')
  const policyData = policy.data() ?? {}
  const domains = isRecord(policyData.domains) ? policyData.domains : {}
  const identity = isRecord(domains.identity) ? domains.identity : {}
  const enforcement = isRecord(policyData.enforcement) ? policyData.enforcement : {}
  if (!['granted','limited'].includes(String(identity.mode ?? '')) || identity.likenessEnabled !== true || enforcement.state !== 'fully-enforced') {
    throw new functions.https.HttpsError('permission-denied', 'IDENTITY_LIKENESS_NOT_AUTHORIZED')
  }

  const personId = requireToken(bundle.get('personId'), 'personId')
  const bindingId = `${bundleId}:${modality}`
  const bindingBody = {
    schemaVersion: 'urai-person-render-binding-v1',
    ownerId,
    personId,
    bundleId,
    bundleHash,
    dependencyIds: [...new Set([bundleId, personId, ...tokenArray(bundle.get('dependencyIds'), 512), ...tokenArray(bundle.get('sourceIds'), 512)])],
    modality,
    provider,
    providerResourceId,
    ...(providerModelId ? { providerModelId } : {}),
    reviewState: 'ACCEPTED',
    consentState: 'authorized',
    state: 'current',
    reviewReceiptHash,
    sourceAuthorityHash,
    consentRefs,
    promotedByUid: context.auth?.uid ?? null,
  }
  const bindingHash = stableDigest(bindingBody)
  await db.doc(`users/${ownerId}/personRenderBindings/${bindingId}`).set({
    ...bindingBody,
    bindingHash,
    promotedAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp(),
  }, { merge: false })
  await db.collection(`users/${ownerId}/privacyAudit`).add({
    ownerId,
    kind: 'person_render_binding.promoted',
    bundleId,
    personId,
    modality,
    provider,
    bindingHash,
    reviewReceiptHash,
    sourceAuthorityHash,
    recordedAt: fieldValue.serverTimestamp(),
  })
  return { bindingId, bundleId, personId, modality, bindingHash }
})

export const revokePersonRenderBinding = personPresenceFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const bundleId = requireToken(data?.bundleId, 'bundleId')
  const modality = String(data?.modality ?? '')
  if (!['voice','visual','motion'].includes(modality)) throw new functions.https.HttpsError('invalid-argument', 'Render modality is invalid.')
  const bindingId = `${bundleId}:${modality}`
  const ref = db.doc(`users/${uid}/personRenderBindings/${bindingId}`)
  const binding = await ref.get()
  if (!binding.exists || binding.get('ownerId') !== uid) throw new functions.https.HttpsError('not-found', 'Person render binding was not found.')
  await ref.set({
    state: 'revoked',
    consentState: 'revoked',
    revokedAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  await db.collection(`users/${uid}/privacyAudit`).add({
    ownerId: uid,
    kind: 'person_render_binding.revoked',
    bundleId,
    modality,
    recordedAt: fieldValue.serverTimestamp(),
  })
  return { bindingId, revoked: true }
})
