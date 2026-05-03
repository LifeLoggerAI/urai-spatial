'use client'

import { useEffect, useMemo, useState } from 'react'
import { SPATIAL_FEATURE_MATRIX } from './config'
import { evaluateTierLock } from './evaluateTierLock'
import type { SpatialFeatureId, TierLockContext, TierLockDecision, UraiTier } from './types'

const TIER1_FLAGS = {
  spatial_home_sky: true,
  spatial_weather_basic: true,
  spatial_starfield_preview: true,
}

function emitSpatialTelemetry(event: string, payload: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event, { detail: payload }))
  }
  if (process.env.NEXT_PUBLIC_URAI_DEBUG_SPATIAL === 'true') {
    console.info('[urai-spatial-lock]', event, payload)
  }
}

function envTier(): UraiTier {
  const tier = process.env.NEXT_PUBLIC_URAI_USER_TIER
  return tier === 'tier2' || tier === 'tier3' ? tier : 'tier1'
}

function baseContext(userTier: UraiTier): TierLockContext {
  return {
    authenticated: userTier !== 'tier1',
    userTier,
    featureFlags: TIER1_FLAGS,
    consents: {},
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entitlementSource: {
      userDocEntitlement: false,
      customClaims: false,
      adminOverride: false,
      founderOverride: false,
      localDemoFallback: userTier === 'tier1',
    },
  }
}

async function callServerEvaluator(featureId: SpatialFeatureId): Promise<TierLockDecision | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !projectId || !appId) return null

  const [{ initializeApp, getApps }, { getFunctions, httpsCallable }] = await Promise.all([
    import('firebase/app'),
    import('firebase/functions'),
  ])

  const app = getApps()[0] ?? initializeApp({
    apiKey,
    projectId,
    appId,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  })

  const functions = getFunctions(app)
  const callable = httpsCallable<{ featureId: SpatialFeatureId }, TierLockDecision>(functions, 'evaluateSpatialTierLock')
  const result = await callable({ featureId })
  return result.data
}

export function useUserTier(): UraiTier {
  const [tier, setTier] = useState<UraiTier>('tier1')

  useEffect(() => {
    const detected = envTier()
    setTier(detected)
    emitSpatialTelemetry('spatial_tier_detected', { userTier: detected })
  }, [])

  return tier
}

export function useSpatialTierLock(featureId: SpatialFeatureId): TierLockDecision {
  const userTier = useUserTier()
  const localDecision = useMemo(() => evaluateTierLock(featureId, baseContext(userTier)), [featureId, userTier])
  const [decision, setDecision] = useState<TierLockDecision>(localDecision)

  useEffect(() => {
    let cancelled = false
    const cfg = SPATIAL_FEATURE_MATRIX[featureId]
    const fallbackDecision = evaluateTierLock(featureId, baseContext(userTier))

    emitSpatialTelemetry('spatial_lock_evaluated', {
      featureId,
      requiredTier: fallbackDecision.requiredTier,
      userTier: fallbackDecision.userTier,
      reasons: fallbackDecision.reasons,
      environment: fallbackDecision.flags,
    })

    if (!cfg.requiresServerCheck) {
      setDecision(fallbackDecision)
      emitSpatialTelemetry(fallbackDecision.allowed ? 'spatial_lock_allowed' : 'spatial_lock_denied', fallbackDecision)
      if (!fallbackDecision.allowed) emitSpatialTelemetry('spatial_lock_fallback_rendered', { featureId, fallback: fallbackDecision.safeFallbackFeatureId })
      return () => { cancelled = true }
    }

    setDecision({ ...fallbackDecision, allowed: false, reasons: fallbackDecision.reasons.length ? fallbackDecision.reasons : ['unavailable'] })

    callServerEvaluator(featureId)
      .then((serverDecision) => {
        if (cancelled || !serverDecision) return
        setDecision(serverDecision)
        emitSpatialTelemetry(serverDecision.allowed ? 'spatial_lock_allowed' : 'spatial_lock_denied', serverDecision)
        if (!serverDecision.allowed) emitSpatialTelemetry('spatial_lock_fallback_rendered', { featureId, fallback: serverDecision.safeFallbackFeatureId })
      })
      .catch(() => {
        if (cancelled) return
        const denied: TierLockDecision = { ...fallbackDecision, allowed: false, reasons: ['unavailable'], safeFallbackFeatureId: fallbackDecision.safeFallbackFeatureId ?? 'spatial.home.sky' }
        setDecision(denied)
        emitSpatialTelemetry('spatial_lock_denied', denied)
        emitSpatialTelemetry('spatial_lock_fallback_rendered', { featureId, fallback: denied.safeFallbackFeatureId })
      })

    return () => { cancelled = true }
  }, [featureId, userTier])

  return decision
}

export function useSpatialFeatureEnabled(featureId: SpatialFeatureId): boolean {
  const decision = useSpatialTierLock(featureId)
  return useMemo(() => decision.allowed, [decision.allowed])
}
