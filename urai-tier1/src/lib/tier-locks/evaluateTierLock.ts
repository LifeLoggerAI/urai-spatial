import { SPATIAL_FEATURE_MATRIX, TIER_ORDER } from './config'
import type { LockReason, SpatialFeatureId, TierLockContext, TierLockDecision } from './types'

export function evaluateTierLock(featureId: SpatialFeatureId, context: TierLockContext): TierLockDecision {
  const cfg = SPATIAL_FEATURE_MATRIX[featureId]
  if (!cfg) {
    return {
      allowed: false,
      featureId,
      requiredTier: 'tier3',
      userTier: context.userTier,
      reasons: ['unknown'],
      flags: {},
      safeFallbackFeatureId: 'spatial.home.sky',
      messageKey: 'tierLock.unknown',
    }
  }

  const reasons: LockReason[] = []
  const flags: Record<string, boolean> = {}
  const hasPrivilegedOverride = context.isAdmin === true || context.isFounder === true

  for (const flag of cfg.requiredFeatureFlags) {
    const enabled = Boolean(context.featureFlags[flag])
    flags[flag] = enabled
    if (!enabled && !hasPrivilegedOverride) reasons.push('feature_flag_disabled')
  }

  if (cfg.requiresAuth && !context.authenticated && !hasPrivilegedOverride) reasons.push('unauthenticated')
  if (TIER_ORDER[context.userTier] < TIER_ORDER[cfg.requiredTier] && !hasPrivilegedOverride) reasons.push('insufficient_tier')

  if (!hasPrivilegedOverride) {
    for (const consent of cfg.requiredConsents) {
      if (context.consents[consent] !== true) {
        reasons.push('missing_consent')
        break
      }
    }
  }

  if (cfg.safetyClass === 'admin' && !hasPrivilegedOverride) reasons.push('admin_only')
  if (cfg.safetyClass === 'premium' && context.safetyChecks && Object.values(context.safetyChecks).some((passed) => passed === false)) {
    reasons.push('safety_blocked')
  }

  const allowed = reasons.length === 0
  return {
    allowed,
    featureId,
    requiredTier: cfg.requiredTier,
    userTier: context.userTier,
    reasons: Array.from(new Set(reasons)),
    flags,
    safeFallbackFeatureId: allowed ? undefined : cfg.fallbackFeature,
    messageKey: allowed ? 'tierLock.allowed' : 'tierLock.denied',
  }
}

export function isSpatialFeatureId(value: string): value is SpatialFeatureId {
  return Object.prototype.hasOwnProperty.call(SPATIAL_FEATURE_MATRIX, value)
}
