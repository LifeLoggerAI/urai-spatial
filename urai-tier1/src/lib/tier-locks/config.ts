import { CANONICAL_FEATURE_RULES, TIER_ORDER, type SpatialFeatureId, type UraiTier, type SafetyClass } from '../../../../packages/tier-locks/src/index'

export type { SafetyClass }

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

export const SPATIAL_FEATURE_MATRIX: Record<SpatialFeatureId, FeatureMatrixEntry> = Object.fromEntries(
  Object.entries(CANONICAL_FEATURE_RULES).map(([featureId, cfg]) => [
    featureId,
    {
      featureId: featureId as SpatialFeatureId,
      requiredTier: cfg.requiredTier,
      requiredFeatureFlags: cfg.requiredFlags,
      requiredConsents: cfg.requiredConsents,
      requiresAuth: cfg.requiresAuth,
      requiresServerCheck: cfg.requiredTier !== 'tier1',
      safetyClass: cfg.safetyClass,
      fallbackFeature: cfg.fallback,
      telemetryEvent: `${featureId.replace(/\./g, '_')}_rendered`,
      defaultEnabledInStaging: cfg.requiredTier === 'tier1' || featureId === 'spatial.lifeMap.personal' || featureId === 'spatial.memoryStars.personal',
      defaultEnabledInProduction: cfg.requiredTier === 'tier1',
    },
  ])
) as Record<SpatialFeatureId, FeatureMatrixEntry>

export { TIER_ORDER }
