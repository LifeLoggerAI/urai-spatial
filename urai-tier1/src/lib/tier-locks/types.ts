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

export type SafetyClass = 'baseline' | 'personal' | 'premium' | 'admin'
export type UraiEnvironment = 'development' | 'staging' | 'production' | 'test'

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
  userDocEntitlement: boolean
  customClaims: boolean
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
  environment: UraiEnvironment
  entitlementSource?: EntitlementSource
}

export interface FeatureMatrixEntry {
  featureId: SpatialFeatureId
  requiredTier: UraiTier
  requiredFeatureFlags: string[]
  requiredConsents: string[]
  requiresAuth: boolean
  requiresServerCheck: boolean
  safetyClass: SafetyClass
  fallbackFeature: SpatialFeatureId
  telemetryEvent: string
  defaultEnabledInStaging: boolean
  defaultEnabledInProduction: boolean
}
