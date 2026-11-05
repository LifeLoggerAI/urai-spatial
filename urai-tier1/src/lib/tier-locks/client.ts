'use client'

import { useEffect, useMemo, useState } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { functions, firebasePublicEnvReady, getUraiAuth } from '../firebase/client'
import { currentTierLockDecision } from './tierLockDecisionOwner.mjs'
import { evaluateTierLock } from './evaluateTierLock'
import type { SpatialFeatureId, TierLockDecision, TierLockContext, UraiTier } from './types'

function telemetry(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') console.info('[spatial-telemetry]', event, payload)
}

function defaultContext(userTier: UraiTier): TierLockContext {
  return {
    // A public tier hint is not a verified signed-in session.
    authenticated: false,
    userTier,
    featureFlags: {
      spatial_home_sky: true,
      spatial_weather_basic: true,
      spatial_starfield_preview: true
    },
    consents: {},
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  }
}

function getCallable() {
  // The shared client has already validated all six Firebase identity fields
  // and any pre-existing default app. Never initialize a second project here.
  if (!firebasePublicEnvReady) return null
  return httpsCallable(functions, 'evaluateSpatialTierLock')
}

export function useUserTier(): UraiTier {
  const [tier, setTier] = useState<UraiTier>('tier1')

  useEffect(() => {
    const t = process.env.NEXT_PUBLIC_URAI_USER_TIER

    if (t === 'tier1' || t === 'tier2' || t === 'tier3') setTier(t)

    telemetry('spatial_tier_detected', { userTier: t ?? 'tier1' })
  }, [])

  return tier
}

type AuthIdentity = { uid: string | null; epoch: number }
type BoundTierDecision = {
  uid: string
  epoch: number
  featureId: SpatialFeatureId
  userTier: UraiTier
  decision: TierLockDecision
}

export function useSpatialTierLock(featureId: SpatialFeatureId): TierLockDecision {
  const userTier = useUserTier()
  const [identity, setIdentity] = useState<AuthIdentity>({ uid: null, epoch: 0 })
  const [resolved, setResolved] = useState<BoundTierDecision | null>(null)

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    // Every sign-out, owner switch or token refresh creates a new generation.
    // Until Firebase Auth reports a user, nonpublic grants remain unavailable.
    return onIdTokenChanged(getUraiAuth(),
      (user) => {
        setResolved(null)
        setIdentity((previous) => ({ uid: user?.uid ?? null, epoch: previous.epoch + 1 }))
      },
      () => {
        setResolved(null)
        setIdentity((previous) => ({ uid: null, epoch: previous.epoch + 1 }))
      },
    )
  }, [])

  useEffect(() => {
    let active = true
    const fallback = evaluateTierLock(featureId, defaultContext(userTier))
    if (!identity.uid) return () => { active = false }
    const callable = getCallable()
    if (!callable) return () => { active = false }

    callable({ featureId })
      .then((res: any) => {
        if (!active) return
        const data = res.data as TierLockDecision
        if (!data || data.featureId !== featureId || typeof data.allowed !== 'boolean') return
        setResolved({ uid: identity.uid!, epoch: identity.epoch, featureId, userTier, decision: data })
        telemetry(data.allowed ? 'spatial_lock_allowed' : 'spatial_lock_denied', {
          featureId: data.featureId,
          reasons: data.reasons,
        })
      })
      .catch(() => {
        if (!active) return
        telemetry('spatial_lock_fallback_rendered', {
          featureId,
          fallback: fallback.safeFallbackFeatureId,
        })
      })

    return () => { active = false }
  }, [featureId, userTier, identity.uid, identity.epoch])

  const fallback = evaluateTierLock(featureId, defaultContext(userTier))
  // Epoch and UID are compared while rendering: previous grants cannot flash
  // after an identity change while React awaits the effect cleanup.
  return currentTierLockDecision(resolved, identity, featureId, userTier) ?? fallback
}

export function useSpatialFeatureEnabled(featureId: SpatialFeatureId): boolean {
  const decision = useSpatialTierLock(featureId)
  return useMemo(() => decision.allowed, [decision.allowed])
}