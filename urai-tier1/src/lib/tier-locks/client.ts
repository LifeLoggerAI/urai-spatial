'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getAuth, onIdTokenChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, functions, firebasePublicEnvReady } from '../firebase/client'
import { canApplyTierDecision, type TierDecisionScope } from './authDecisionScope'
import { SPATIAL_FEATURE_MATRIX } from './config'
import { evaluateTierLock } from './evaluateTierLock'
import type { SpatialFeatureId, TierLockDecision, TierLockContext, UraiTier } from './types'

type ObservedIdentity = { uid: string | null; revision: number; initialized: boolean }
type ScopedDecision = { scope: TierDecisionScope; decision: TierLockDecision }

function telemetry(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') console.info('[spatial-telemetry]', event, payload)
}

function defaultContext(userTier: UraiTier): TierLockContext {
  return {
    // Public NEXT_PUBLIC tier flags are not authenticated identity or consent.
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
  // No second Firebase app or three-field public-project initialization.
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

export function useSpatialTierLock(featureId: SpatialFeatureId): TierLockDecision {
  const userTier = useUserTier()
  const authRevision = useRef(0)
  const [identity, setIdentity] = useState<ObservedIdentity>({
    uid: null,
    revision: 0,
    initialized: false,
  })
  const [resolved, setResolved] = useState<ScopedDecision | null>(null)
  const fallback = useMemo(() => evaluateTierLock(featureId, defaultContext(userTier)), [featureId, userTier])
  const requiresAuth = SPATIAL_FEATURE_MATRIX[featureId]?.requiresAuth ?? true
  const scope: TierDecisionScope = {
    featureId,
    userTier,
    uid: identity.uid,
    revision: identity.revision,
    requiresAuth,
  }

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    let active = true
    let unsubscribe = () => {}
    try {
      const auth = getAuth(app)
      unsubscribe = onIdTokenChanged(auth, (user) => {
        if (!active) return
        // Revision changes even for the same UID on token refresh/revocation.
        const revision = ++authRevision.current
        setResolved(null)
        setIdentity({ uid: user?.uid ?? null, revision, initialized: true })
      }, () => {
        if (!active) return
        const revision = ++authRevision.current
        setResolved(null)
        setIdentity({ uid: null, revision, initialized: false })
      })
    } catch {
      // Auth initialization errors retain the unauthenticated fallback.
      const revision = ++authRevision.current
      setResolved(null)
      setIdentity({ uid: null, revision, initialized: false })
    }
    return () => {
      active = false
      ++authRevision.current
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Wait for an actual Firebase Auth observer; never infer user identity
    // from NEXT_PUBLIC_URAI_USER_TIER or a previous feature's cached grant.
    if (!firebasePublicEnvReady || !identity.initialized || (requiresAuth && !identity.uid)) return
    const callable = getCallable()
    if (!callable) return
    let active = true
    const requestScope: TierDecisionScope = { ...scope }

    callable({ featureId }).then((response) => {
      if (!active || authRevision.current !== requestScope.revision) return
      // Re-read the actual SDK owner BEFORE applying a late response.
      const currentOwner = getAuth(app).currentUser?.uid ?? null
      const currentScope: TierDecisionScope = { ...requestScope, uid: currentOwner, revision: authRevision.current }
      if (!canApplyTierDecision(requestScope, currentScope, response.data)) return
      const decision = response.data as TierLockDecision
      setResolved({ scope: requestScope, decision })
      telemetry(decision.allowed ? 'spatial_lock_allowed' : 'spatial_lock_denied', {
        featureId: decision.featureId,
        reasons: decision.reasons
      })
    }).catch(() => {
      if (!active) return
      telemetry('spatial_lock_fallback_rendered', {
        featureId,
        fallback: fallback.safeFallbackFeatureId
      })
    })

    return () => { active = false }
  }, [featureId, userTier, identity.uid, identity.revision, identity.initialized, requiresAuth])

  // Render-time scope matching prevents a previous owner/feature/tier decision
  // from surviving the first re-render after an Auth identity transition.
  return resolved && identity.initialized &&
    canApplyTierDecision(resolved.scope, scope, resolved.decision)
      ? resolved.decision
      : fallback
}

export function useSpatialFeatureEnabled(featureId: SpatialFeatureId): boolean {
  const decision = useSpatialTierLock(featureId)
  return useMemo(() => decision.allowed, [decision.allowed])
}
