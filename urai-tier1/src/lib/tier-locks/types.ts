export type UraiTier = 'tier1' | 'tier2' | 'tier3'

export type LockReason =
  | 'unauthenticated'
  | 'insufficient_tier'
  | 'missing_consent'
  | 'feature_flag_disabled'
  | 'safety_blocked'
  | 'admin_only'
  | 'unavailable'
  | 'unknown'

export type SpatialFeatureId =
  | 'spatial.home.sky'
  | 'spatial.weather.basic'
  | 'spatial.starfield.preview'
  | 'spatial.lifeMap.personal'
  | 'spatial.memoryStars.personal'
  | 'spatial.companion.visual'
  | 'spatial.ritual.preview'
  | 'spatial.ritual.interactive'
  | 'spatial.dreamPlanetarium'
  | 'spatial.lifeMuseum'
  | 'spatial.seasonTunnel'
  | 'spatial.xr.roomMapping'
  | 'spatial.vr.memoryRoom'
  | 'spatial.marketplace.freeAssets'
  | 'spatial.marketplace.paidAssets'
  | 'spatial.exports.card'
  | 'spatial.exports.story'
  | 'spatial.admin.inspectLocks'

export interface TierLockDecision {
  allowed: boolean
  featureId: SpatialFeatureId
  requiredTier: UraiTier
  userTier: UraiTier
  reasons: LockReason[]
  flags: Record<string, boolean>
  safeFallbackFeatureId?: SpatialFeatureId
  messageKey?: string
  auditId?: string
}

export interface EntitlementSource {
  fromUserDoc: boolean
  fromCustomClaims: boolean
  adminOverride: boolean
  founderOverride: boolean
  localDemoFallback: boolean
}

export interface TierLockContext {
  uid?: string | null
  authenticated: boolean
  userTier: UraiTier
  featureFlags: Record<string, boolean>
  consents: Record<string, boolean>
  isAdmin?: boolean
  isFounder?: boolean
  safetyChecks?: Record<string, boolean>
  environment: 'development' | 'staging' | 'production' | 'test'
}
