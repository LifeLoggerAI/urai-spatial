import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

type UraiTier = 'tier1' | 'tier2' | 'tier3'
type LockReason = 'unauthenticated' | 'insufficient_tier' | 'missing_consent' | 'feature_flag_disabled' | 'safety_blocked' | 'admin_only' | 'unavailable' | 'unknown'
type SpatialFeatureId =
  | 'spatial.home.sky' | 'spatial.weather.basic' | 'spatial.starfield.preview'
  | 'spatial.lifeMap.personal' | 'spatial.memoryStars.personal' | 'spatial.companion.visual'
  | 'spatial.ritual.preview' | 'spatial.ritual.interactive' | 'spatial.dreamPlanetarium'
  | 'spatial.lifeMuseum' | 'spatial.seasonTunnel' | 'spatial.xr.roomMapping'
  | 'spatial.vr.memoryRoom' | 'spatial.marketplace.freeAssets' | 'spatial.marketplace.paidAssets'
  | 'spatial.exports.card' | 'spatial.exports.story' | 'spatial.admin.inspectLocks'

const TIER_ORDER: Record<UraiTier, number> = { tier1: 1, tier2: 2, tier3: 3 }

const FEATURE_RULES: Record<SpatialFeatureId, { requiredTier: UraiTier; requiresAuth: boolean; requiredConsents: string[]; requiredFlags: string[]; adminOnly?: boolean; safetyClass: 'baseline' | 'personal' | 'premium' | 'admin'; fallback: SpatialFeatureId }> = {
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
}


export function evaluateDecision(input: { featureId: SpatialFeatureId; userTier: UraiTier; authenticated: boolean; isAdmin: boolean; isFounder: boolean; consents: Record<string, boolean>; flags: Record<string, boolean> }) {
  const cfg = FEATURE_RULES[input.featureId]
  const reasons: LockReason[] = []
  if (cfg.requiresAuth && !input.authenticated && !input.isAdmin && !input.isFounder) reasons.push('unauthenticated')
  if (!input.isAdmin && !input.isFounder && TIER_ORDER[input.userTier] < TIER_ORDER[cfg.requiredTier]) reasons.push('insufficient_tier')
  if (cfg.adminOnly && !input.isAdmin && !input.isFounder) reasons.push('admin_only')
  for (const c of cfg.requiredConsents) { if (!input.consents[c] && !input.isAdmin && !input.isFounder) { reasons.push('missing_consent'); break } }
  for (const f of cfg.requiredFlags) { if (!input.flags[f]) reasons.push('feature_flag_disabled') }
  return { allowed: reasons.length===0, reasons, requiredTier: cfg.requiredTier, fallback: cfg.fallback }
}

export const evaluateSpatialTierLock = functions.https.onCall(async (data, context) => {
  const featureId = String(data?.featureId ?? '') as SpatialFeatureId
  const cfg = FEATURE_RULES[featureId]
  if (!cfg) throw new functions.https.HttpsError('invalid-argument', 'Unknown featureId')

  const uid = context.auth?.uid ?? null
  const claims = context.auth?.token ?? {}
  const isAdmin = claims.admin === true
  const isFounder = claims.founder === true

  const reasons: LockReason[] = []
  const flags: Record<string, boolean> = {}

  if (cfg.requiresAuth && !uid && !isAdmin && !isFounder) reasons.push('unauthenticated')

  let userTier: UraiTier = 'tier1'
  let consents: Record<string, boolean> = {}
  if (uid) {
    const userDoc = await admin.firestore().doc(`users/${uid}`).get()
    if (userDoc.exists) {
      const docTier = userDoc.get('entitlementTier') as UraiTier | undefined
      if (docTier && (docTier === 'tier1' || docTier === 'tier2' || docTier === 'tier3')) userTier = docTier
      consents = userDoc.get('consents') ?? {}
    }
  }

  if (!isAdmin && !isFounder && TIER_ORDER[userTier] < TIER_ORDER[cfg.requiredTier]) reasons.push('insufficient_tier')
  if (cfg.adminOnly && !isAdmin && !isFounder) reasons.push('admin_only')

  for (const c of cfg.requiredConsents) {
    if (!consents[c] && !isAdmin && !isFounder) {
      reasons.push('missing_consent')
      break
    }
  }

  for (const flagName of cfg.requiredFlags) {
    const snap = await admin.firestore().doc(`features/${flagName}`).get()
    const enabled = snap.exists ? Boolean(snap.get('enabled')) : false
    flags[flagName] = enabled
    if (!enabled) reasons.push('feature_flag_disabled')
  }

  const allowed = reasons.length === 0
  const response = { allowed, featureId, requiredTier: cfg.requiredTier, userTier, reasons, flags, safeFallbackFeatureId: allowed ? undefined : cfg.fallback, messageKey: allowed ? 'tierLock.allowed' : 'tierLock.denied', auditId: undefined as string | undefined }

  if (!allowed && uid && cfg.requiredTier !== 'tier1') {
    const auditRef = admin.firestore().collection(`users/${uid}/tierLockAudit`).doc()
    await auditRef.set({ featureId, reasons, requiredTier: cfg.requiredTier, userTier, flags, createdAt: admin.firestore.FieldValue.serverTimestamp() })
    response.auditId = auditRef.id
  }

  return response
})
