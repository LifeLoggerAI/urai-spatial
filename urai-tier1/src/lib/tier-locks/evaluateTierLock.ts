import { SPATIAL_FEATURE_MATRIX, TIER_ORDER } from './config'
import type { LockReason, SpatialFeatureId, TierLockContext, TierLockDecision } from './types'

export function evaluateTierLock(featureId: SpatialFeatureId, context: TierLockContext): TierLockDecision {
  const cfg = SPATIAL_FEATURE_MATRIX[featureId]
  const reasons: LockReason[] = []
  const flags: Record<string, boolean> = {}

  if (!cfg) {
    return { allowed: false, featureId, requiredTier: 'tier3', userTier: context.userTier, reasons: ['unknown'], flags: {}, messageKey: 'tierLock.unknown', safeFallbackFeatureId: 'spatial.home.sky' }
  }

  for (const f of cfg.requiredFeatureFlags) {
    const enabled = Boolean(context.featureFlags[f])
    flags[f] = enabled
    if (!enabled) reasons.push('feature_flag_disabled')
  }

  if (cfg.requiresAuth && !context.authenticated) reasons.push('unauthenticated')
  if (TIER_ORDER[context.userTier] < TIER_ORDER[cfg.requiredTier] && !context.isAdmin && !context.isFounder) reasons.push('insufficient_tier')
  for (const c of cfg.requiredConsents) {
    if (!context.consents[c]) {
      reasons.push('missing_consent')
      break
    }
  }
  if (cfg.safetyClass === 'admin' && !context.isAdmin && !context.isFounder) reasons.push('admin_only')
  if (cfg.safetyClass === 'premium' && context.safetyChecks && Object.values(context.safetyChecks).some((x) => x === false)) reasons.push('safety_blocked')

  const allowed = reasons.length === 0
  return {
    allowed,
    featureId,
    requiredTier: cfg.requiredTier,
    userTier: context.userTier,
    reasons,
    flags,
    safeFallbackFeatureId: allowed ? undefined : cfg.fallbackFeature,
    messageKey: allowed ? 'tierLock.allowed' : 'tierLock.denied',
  }
}
