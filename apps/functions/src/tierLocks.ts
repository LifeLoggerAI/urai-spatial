import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import {
  CANONICAL_FEATURE_RULES,
  TIER_ORDER,
  type SpatialFeatureId,
  type UraiTier,
} from '../../../packages/tier-locks/src/index'

if (!admin.apps.length) admin.initializeApp()

type LockReason =
  | 'unauthenticated'
  | 'insufficient_tier'
  | 'missing_consent'
  | 'feature_flag_disabled'
  | 'safety_blocked'
  | 'admin_only'
  | 'unavailable'
  | 'unknown'

export function evaluateDecision(input: {
  featureId: SpatialFeatureId
  userTier: UraiTier
  authenticated: boolean
  isAdmin: boolean
  isFounder: boolean
  consents: Record<string, boolean>
  flags: Record<string, boolean>
  safetyChecks?: Record<string, boolean>
}) {
  const cfg = CANONICAL_FEATURE_RULES[input.featureId]

  if (!cfg) {
    return {
      allowed: false,
      reasons: ['unknown'] as LockReason[],
      requiredTier: undefined,
      fallback: undefined,
    }
  }

  const reasons: LockReason[] = []

  if (cfg.requiresAuth && !input.authenticated && !input.isAdmin && !input.isFounder) {
    reasons.push('unauthenticated')
  }

  if (
    !input.isAdmin &&
    !input.isFounder &&
    TIER_ORDER[input.userTier] < TIER_ORDER[cfg.requiredTier]
  ) {
    reasons.push('insufficient_tier')
  }

  if (cfg.adminOnly && !input.isAdmin && !input.isFounder) {
    reasons.push('admin_only')
  }

  for (const consent of cfg.requiredConsents) {
    if (!input.consents[consent] && !input.isAdmin && !input.isFounder) {
      reasons.push('missing_consent')
      break
    }
  }

  for (const flag of cfg.requiredFlags) {
    if (!input.flags[flag]) {
      reasons.push('feature_flag_disabled')
    }
  }

  if (
    cfg.safetyClass === 'premium' &&
    input.safetyChecks &&
    Object.values(input.safetyChecks).some((value) => value === false) &&
    !input.isAdmin &&
    !input.isFounder
  ) {
    reasons.push('safety_blocked')
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    requiredTier: cfg.requiredTier,
    fallback: cfg.fallback,
  }
}

export const evaluateSpatialTierLock = functions.https.onCall(async (data, context) => {
  const featureId = String(data?.featureId ?? '') as SpatialFeatureId
  const cfg = CANONICAL_FEATURE_RULES[featureId]

  if (!cfg) {
    throw new functions.https.HttpsError('invalid-argument', 'Unknown featureId')
  }

  const uid = context.auth?.uid ?? null
  const claims = context.auth?.token ?? {}
  const isAdmin = claims.admin === true
  const isFounder = claims.founder === true

  const reasons: LockReason[] = []
  const flags: Record<string, boolean> = {}

  if (cfg.requiresAuth && !uid && !isAdmin && !isFounder) {
    reasons.push('unauthenticated')
  }

  let userTier: UraiTier = 'tier1'
  let consents: Record<string, boolean> = {}

  if (uid) {
    const userDoc = await admin.firestore().doc(`users/${uid}`).get()

    if (userDoc.exists) {
      const docTier = userDoc.get('entitlementTier') as UraiTier | undefined

      if (docTier === 'tier1' || docTier === 'tier2' || docTier === 'tier3') {
        userTier = docTier
      }

      consents = userDoc.get('consents') ?? {}
    }
  }

  if (!isAdmin && !isFounder && TIER_ORDER[userTier] < TIER_ORDER[cfg.requiredTier]) {
    reasons.push('insufficient_tier')
  }

  if (cfg.adminOnly && !isAdmin && !isFounder) {
    reasons.push('admin_only')
  }

  for (const consent of cfg.requiredConsents) {
    if (!consents[consent] && !isAdmin && !isFounder) {
      reasons.push('missing_consent')
      break
    }
  }

  const flagResults = await Promise.all(
    cfg.requiredFlags.map(async (flagName) => {
      const snap = await admin.firestore().doc(`features/${flagName}`).get()
      return {
        flagName,
        enabled: snap.exists ? Boolean(snap.get('enabled')) : false,
      }
    }),
  )

  for (const { flagName, enabled } of flagResults) {
    flags[flagName] = enabled

    if (!enabled) {
      reasons.push('feature_flag_disabled')
    }
  }

  const safetyChecks = uid
    ? (((await admin.firestore().doc(`users/${uid}/meta/safety`).get()).data() ?? {}) as Record<
        string,
        boolean
      >)
    : {}

  if (
    cfg.safetyClass === 'premium' &&
    Object.values(safetyChecks).some((value) => value === false) &&
    !isAdmin &&
    !isFounder
  ) {
    reasons.push('safety_blocked')
  }

  const allowed = reasons.length === 0

  const response = {
    allowed,
    featureId,
    requiredTier: cfg.requiredTier,
    userTier,
    reasons,
    flags,
    safeFallbackFeatureId: allowed ? undefined : cfg.fallback,
    messageKey: allowed ? 'tierLock.allowed' : 'tierLock.denied',
    auditId: undefined as string | undefined,
  }

  if (!allowed && uid && cfg.requiredTier !== 'tier1') {
    const auditRef = admin.firestore().collection(`users/${uid}/tierLockAudit`).doc()

    await auditRef.set({
      featureId,
      reasons,
      requiredTier: cfg.requiredTier,
      userTier,
      flags,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    response.auditId = auditRef.id
  }

  return response
})