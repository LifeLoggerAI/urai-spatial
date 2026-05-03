import type { FeatureMatrixEntry, SpatialFeatureId, UraiTier } from './types'

export const TIER_ORDER: Record<UraiTier, number> = { tier1: 1, tier2: 2, tier3: 3 }

export const SPATIAL_FEATURE_MATRIX: Record<SpatialFeatureId, FeatureMatrixEntry> = {
  'spatial.home.sky': entry('spatial.home.sky', 'tier1', ['spatial_home_sky'], [], false, false, 'baseline', 'spatial.home.sky', true, true),
  'spatial.weather.basic': entry('spatial.weather.basic', 'tier1', ['spatial_weather_basic'], [], false, false, 'baseline', 'spatial.home.sky', true, true),
  'spatial.starfield.preview': entry('spatial.starfield.preview', 'tier1', ['spatial_starfield_preview'], [], false, false, 'baseline', 'spatial.home.sky', true, true),
  'spatial.lifeMap.personal': entry('spatial.lifeMap.personal', 'tier2', ['spatial_lifemap_personal'], ['privacy.core', 'spatial.personalization'], true, true, 'personal', 'spatial.starfield.preview', true, false),
  'spatial.memoryStars.personal': entry('spatial.memoryStars.personal', 'tier2', ['spatial_memory_stars_personal'], ['privacy.core', 'spatial.personalization'], true, true, 'personal', 'spatial.starfield.preview', true, false),
  'spatial.companion.visual': entry('spatial.companion.visual', 'tier2', ['spatial_companion_visual'], ['privacy.core', 'spatial.companion'], true, true, 'personal', 'spatial.starfield.preview', false, false),
  'spatial.ritual.preview': entry('spatial.ritual.preview', 'tier2', ['spatial_ritual_preview'], ['privacy.core'], true, true, 'personal', 'spatial.starfield.preview', true, false),
  'spatial.ritual.interactive': entry('spatial.ritual.interactive', 'tier3', ['spatial_ritual_interactive'], ['privacy.core', 'spatial.interactive'], true, true, 'premium', 'spatial.ritual.preview', false, false),
  'spatial.dreamPlanetarium': entry('spatial.dreamPlanetarium', 'tier3', ['spatial_dream_planetarium'], ['privacy.core', 'spatial.personalization'], true, true, 'premium', 'spatial.lifeMap.personal', false, false),
  'spatial.lifeMuseum': entry('spatial.lifeMuseum', 'tier3', ['spatial_life_museum'], ['privacy.core', 'spatial.personalization'], true, true, 'premium', 'spatial.lifeMap.personal', false, false),
  'spatial.seasonTunnel': entry('spatial.seasonTunnel', 'tier3', ['spatial_season_tunnel'], ['privacy.core'], true, true, 'premium', 'spatial.lifeMap.personal', false, false),
  'spatial.xr.roomMapping': entry('spatial.xr.roomMapping', 'tier3', ['spatial_xr_room_mapping'], ['privacy.core', 'spatial.xr'], true, true, 'premium', 'spatial.home.sky', false, false),
  'spatial.vr.memoryRoom': entry('spatial.vr.memoryRoom', 'tier3', ['spatial_vr_memory_room'], ['privacy.core', 'spatial.xr'], true, true, 'premium', 'spatial.home.sky', false, false),
  'spatial.marketplace.freeAssets': entry('spatial.marketplace.freeAssets', 'tier2', ['spatial_marketplace_free_assets'], ['privacy.core'], true, true, 'personal', 'spatial.home.sky', false, false),
  'spatial.marketplace.paidAssets': entry('spatial.marketplace.paidAssets', 'tier3', ['spatial_marketplace_paid_assets'], ['privacy.core', 'commerce.terms'], true, true, 'premium', 'spatial.marketplace.freeAssets', false, false),
  'spatial.exports.card': entry('spatial.exports.card', 'tier2', ['spatial_exports_card'], ['privacy.core'], true, true, 'personal', 'spatial.home.sky', false, false),
  'spatial.exports.story': entry('spatial.exports.story', 'tier3', ['spatial_exports_story'], ['privacy.core'], true, true, 'premium', 'spatial.exports.card', false, false),
  'spatial.admin.inspectLocks': entry('spatial.admin.inspectLocks', 'tier3', ['spatial_admin_inspect_locks'], [], true, true, 'admin', 'spatial.home.sky', false, false),
}

function entry(
  featureId: SpatialFeatureId,
  requiredTier: UraiTier,
  requiredFeatureFlags: string[],
  requiredConsents: string[],
  requiresAuth: boolean,
  requiresServerCheck: boolean,
  safetyClass: FeatureMatrixEntry['safetyClass'],
  fallbackFeature: SpatialFeatureId,
  defaultEnabledInStaging: boolean,
  defaultEnabledInProduction: boolean,
): FeatureMatrixEntry {
  return {
    featureId,
    requiredTier,
    requiredFeatureFlags,
    requiredConsents,
    requiresAuth,
    requiresServerCheck,
    safetyClass,
    fallbackFeature,
    telemetryEvent: `${featureId.replaceAll('.', '_')}_rendered`,
    defaultEnabledInStaging,
    defaultEnabledInProduction,
  }
}

export const SPATIAL_FEATURE_IDS = Object.keys(SPATIAL_FEATURE_MATRIX) as SpatialFeatureId[]
