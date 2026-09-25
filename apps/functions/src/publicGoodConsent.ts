import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const fieldValue = admin.firestore.FieldValue

const MODES = ['off', 'limited', 'on'] as const
const PRECISIONS = ['country', 'multi-region', 'coarse-region'] as const

type PublicGoodMode = (typeof MODES)[number]
type PublicGoodPrecision = (typeof PRECISIONS)[number]

type GlobalFieldConsent = {
  schemaVersion: 'urai-global-field-consent-1'
  revision: number
  ownerId: string
  mode: PublicGoodMode
  precision: PublicGoodPrecision
  purpose: 'data.public-good.emotional-field'
  consentTier: 'C8'
  policyVersion: string
  contributes: string[]
  neverContributes: string[]
  minimumCohortFloor: 100
  sensitiveHigherThresholdRequired: true
  updatedAt?: unknown
}

const DEFAULT_NEVER_CONTRIBUTES = [
  'individual emotion',
  'household emotion',
  'exact location',
  'street-level signal',
  'building-level signal',
  'raw voice',
  'raw transcript',
  'raw memory',
  'movement trail',
  'named relationship',
  'identifiable social graph',
  'biometric template',
]

function requireUid(context: functions.https.CallableContext): string {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireOperationId(value: unknown): string {
  const operationId = String(value ?? '')
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(operationId)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid operationId is required.')
  }
  return operationId
}

function stableId(uid: string, operationId: string, purpose: string) {
  return createHash('sha256').update(`${purpose}:${uid}:${operationId}`).digest('hex').slice(0, 40)
}

function defaultConsent(uid: string): GlobalFieldConsent {
  return {
    schemaVersion: 'urai-global-field-consent-1',
    revision: 0,
    ownerId: uid,
    mode: 'off',
    precision: 'country',
    purpose: 'data.public-good.emotional-field',
    consentTier: 'C8',
    policyVersion: 'global-emotional-field-v1-draft',
    contributes: [],
    neverContributes: [...DEFAULT_NEVER_CONTRIBUTES],
    minimumCohortFloor: 100,
    sensitiveHigherThresholdRequired: true,
  }
}

function parseStored(value: FirebaseFirestore.DocumentData | undefined, uid: string): GlobalFieldConsent {
  const fallback = defaultConsent(uid)
  if (!value || value.ownerId !== uid || value.schemaVersion !== 'urai-global-field-consent-1') return fallback
  const mode = MODES.includes(value.mode as PublicGoodMode) ? value.mode as PublicGoodMode : 'off'
  const precision = PRECISIONS.includes(value.precision as PublicGoodPrecision) ? value.precision as PublicGoodPrecision : 'country'
  return {
    ...fallback,
    revision: Number.isInteger(value.revision) && value.revision >= 0 ? value.revision : 0,
    mode,
    precision,
    policyVersion: typeof value.policyVersion === 'string' && value.policyVersion ? value.policyVersion : fallback.policyVersion,
    contributes: Array.isArray(value.contributes) ? value.contributes.filter((entry): entry is string => typeof entry === 'string').slice(0, 16) : [],
    neverContributes: [...DEFAULT_NEVER_CONTRIBUTES],
  }
}

function requestedContributions(mode: PublicGoodMode) {
  if (mode === 'off') return []
  if (mode === 'limited') return ['coarse cohort participation count']
  return [
    'coarse privacy-preserving emotional-field aggregate',
    'coarse temporal bucket',
    'coarse regional bucket',
  ]
}

export const getGlobalEmotionalFieldConsent = functions.https.onCall(async (_data, context) => {
  const uid = requireUid(context)
  const snapshot = await db.doc(`users/${uid}/privacyPolicy/globalEmotionalField`).get()
  const consent = parseStored(snapshot.data(), uid)
  return {
    ...consent,
    providerState: 'not-activated',
    publicationState: 'blocked-pending-governance-and-aggregate-provider',
  }
})

export const applyGlobalEmotionalFieldConsent = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const operationId = requireOperationId(data?.operationId)
  const expectedRevision = Number(data?.expectedRevision)
  const mode = String(data?.mode ?? '') as PublicGoodMode
  const precision = String(data?.precision ?? '') as PublicGoodPrecision
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid expected revision.')
  }
  if (!MODES.includes(mode)) throw new functions.https.HttpsError('invalid-argument', 'Invalid public-good consent mode.')
  if (!PRECISIONS.includes(precision)) throw new functions.https.HttpsError('invalid-argument', 'Invalid aggregate precision.')

  const policyRef = db.doc(`users/${uid}/privacyPolicy/globalEmotionalField`)
  const runtimeRef = db.doc(`users/${uid}/privacyRuntime/global-emotional-field-contribution`)
  const receiptId = stableId(uid, operationId, 'global-field-consent-receipt')
  const receiptRef = db.doc(`users/${uid}/privacyReceipts/${receiptId}`)

  return db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(policyRef)
    const current = parseStored(currentSnapshot.data(), uid)
    if (current.revision !== expectedRevision) {
      throw new functions.https.HttpsError('aborted', 'CONSENT_REVISION_CONFLICT', { currentRevision: current.revision })
    }

    const next: GlobalFieldConsent = {
      ...current,
      revision: current.revision + 1,
      mode,
      precision,
      contributes: requestedContributions(mode),
      neverContributes: [...DEFAULT_NEVER_CONTRIBUTES],
    }
    const enabled = mode !== 'off'
    const now = fieldValue.serverTimestamp()

    transaction.set(policyRef, { ...next, updatedAt: now })
    transaction.set(runtimeRef, {
      ownerId: uid,
      purpose: next.purpose,
      consentTier: next.consentTier,
      enabled,
      mode,
      precision,
      revision: next.revision,
      minimumCohortFloor: 100,
      sensitiveHigherThresholdRequired: true,
      providerState: 'not-activated',
      publicationState: 'blocked-pending-governance-and-aggregate-provider',
      updatedAt: now,
    }, { merge: true })
    transaction.create(receiptRef, {
      receiptId,
      ownerId: uid,
      kind: 'consent',
      domain: 'global-emotional-field-public-good',
      purpose: next.purpose,
      consentTier: 'C8',
      revision: next.revision,
      previousMode: current.mode,
      nextMode: mode,
      precision,
      result: enabled ? 'recorded-provider-blocked' : 'revoked',
      providerState: 'not-activated',
      publicationState: 'blocked-pending-governance-and-aggregate-provider',
      createdAt: now,
      updatedAt: now,
    })

    return {
      ...next,
      receiptId,
      providerState: 'not-activated',
      publicationState: 'blocked-pending-governance-and-aggregate-provider',
    }
  })
})
