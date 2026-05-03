'use client'

import { useEffect, useMemo, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { evaluateTierLock } from './evaluateTierLock'
import type { SpatialFeatureId, TierLockDecision, TierLockContext, UraiTier } from './types'

const cache = new Map<string, TierLockDecision>()

function telemetry(event: string, payload: Record<string, unknown>) { if (process.env.NODE_ENV !== 'production') console.info('[spatial-telemetry]', event, payload) }
function defaultContext(userTier: UraiTier): TierLockContext { return { authenticated: userTier !== 'tier1', userTier, featureFlags: { spatial_home_sky: true, spatial_weather_basic: true, spatial_starfield_preview: true }, consents: {}, environment: process.env.NODE_ENV === 'production' ? 'production' : 'development' } }

function getCallable() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !projectId || !appId) return null
  const app = getApps()[0] ?? initializeApp({ apiKey, projectId, appId })
  return httpsCallable(getFunctions(app), 'evaluateSpatialTierLock')
}

export function useUserTier(): UraiTier {
  const [tier, setTier] = useState<UraiTier>('tier1')
  useEffect(() => { const t = process.env.NEXT_PUBLIC_URAI_USER_TIER; if (t === 'tier1' || t === 'tier2' || t === 'tier3') setTier(t); telemetry('spatial_tier_detected', { userTier: t ?? 'tier1' }) }, [])
  return tier
}

export function useSpatialTierLock(featureId: SpatialFeatureId): TierLockDecision {
  const userTier = useUserTier()
  const [decision, setDecision] = useState<TierLockDecision>(() => evaluateTierLock(featureId, defaultContext(userTier)))

  useEffect(() => {
    let active = true
    const key = `${userTier}:${featureId}`
    if (cache.has(key)) { setDecision(cache.get(key)!); return () => { active = false } }
    const fallback = evaluateTierLock(featureId, defaultContext(userTier))
    setDecision(fallback)

    const callable = getCallable()
    if (!callable) return () => { active = false }
    callable({ featureId }).then((res: any) => {
      if (!active) return
      const data = res.data as TierLockDecision
      cache.set(key, data)
      setDecision(data)
      telemetry(data.allowed ? 'spatial_lock_allowed' : 'spatial_lock_denied', { featureId: data.featureId, reasons: data.reasons })
    }).catch(() => {
      if (!active) return
      telemetry('spatial_lock_fallback_rendered', { featureId, fallback: fallback.safeFallbackFeatureId })
    })
    return () => { active = false }
  }, [featureId, userTier])

  return decision
}

export function useSpatialFeatureEnabled(featureId: SpatialFeatureId): boolean { const decision = useSpatialTierLock(featureId); return useMemo(() => decision.allowed, [decision.allowed]) }
