"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_FEATURE_RULES = exports.TIER_ORDER = void 0;
exports.TIER_ORDER = { tier1: 1, tier2: 2, tier3: 3 };
exports.CANONICAL_FEATURE_RULES = {
    'spatial.home.sky': { requiredTier: 'tier1', requiresAuth: false, requiredConsents: [], requiredFlags: ['spatial_home_sky'], safetyClass: 'baseline', fallback: 'spatial.home.sky' },
    'spatial.weather.basic': { requiredTier: 'tier1', requiresAuth: false, requiredConsents: [], requiredFlags: ['spatial_weather_basic'], safetyClass: 'baseline', fallback: 'spatial.home.sky' },
    'spatial.starfield.preview': { requiredTier: 'tier1', requiresAuth: false, requiredConsents: [], requiredFlags: ['spatial_starfield_preview'], safetyClass: 'baseline', fallback: 'spatial.home.sky' },
    'spatial.lifeMap.personal': { requiredTier: 'tier2', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.personalization'], requiredFlags: ['spatial_lifemap_personal'], safetyClass: 'personal', fallback: 'spatial.starfield.preview' },
    'spatial.memoryStars.personal': { requiredTier: 'tier2', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.personalization'], requiredFlags: ['spatial_memory_stars_personal'], safetyClass: 'personal', fallback: 'spatial.starfield.preview' },
    'spatial.companion.visual': { requiredTier: 'tier2', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.companion'], requiredFlags: ['spatial_companion_visual'], safetyClass: 'personal', fallback: 'spatial.starfield.preview' },
    'spatial.ritual.preview': { requiredTier: 'tier2', requiresAuth: true, requiredConsents: ['privacy.core'], requiredFlags: ['spatial_ritual_preview'], safetyClass: 'personal', fallback: 'spatial.starfield.preview' },
    'spatial.ritual.interactive': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.interactive'], requiredFlags: ['spatial_ritual_interactive'], safetyClass: 'premium', fallback: 'spatial.ritual.preview' },
    'spatial.dreamPlanetarium': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.personalization'], requiredFlags: ['spatial_dream_planetarium'], safetyClass: 'premium', fallback: 'spatial.lifeMap.personal' },
    'spatial.lifeMuseum': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.personalization'], requiredFlags: ['spatial_life_museum'], safetyClass: 'premium', fallback: 'spatial.lifeMap.personal' },
    'spatial.seasonTunnel': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core'], requiredFlags: ['spatial_season_tunnel'], safetyClass: 'premium', fallback: 'spatial.lifeMap.personal' },
    'spatial.xr.roomMapping': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.xr'], requiredFlags: ['spatial_xr_room_mapping'], safetyClass: 'premium', fallback: 'spatial.home.sky' },
    'spatial.vr.memoryRoom': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core', 'spatial.xr'], requiredFlags: ['spatial_vr_memory_room'], safetyClass: 'premium', fallback: 'spatial.home.sky' },
    'spatial.marketplace.freeAssets': { requiredTier: 'tier2', requiresAuth: true, requiredConsents: ['privacy.core'], requiredFlags: ['spatial_marketplace_free_assets'], safetyClass: 'personal', fallback: 'spatial.home.sky' },
    'spatial.marketplace.paidAssets': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core', 'commerce.terms'], requiredFlags: ['spatial_marketplace_paid_assets'], safetyClass: 'premium', fallback: 'spatial.marketplace.freeAssets' },
    'spatial.exports.card': { requiredTier: 'tier2', requiresAuth: true, requiredConsents: ['privacy.core'], requiredFlags: ['spatial_exports_card'], safetyClass: 'personal', fallback: 'spatial.home.sky' },
    'spatial.exports.story': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: ['privacy.core'], requiredFlags: ['spatial_exports_story'], safetyClass: 'premium', fallback: 'spatial.exports.card' },
    'spatial.admin.inspectLocks': { requiredTier: 'tier3', requiresAuth: true, requiredConsents: [], requiredFlags: ['spatial_admin_inspect_locks'], adminOnly: true, safetyClass: 'admin', fallback: 'spatial.home.sky' },
};
