'use client'

import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase/client'

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

export type SpatialTierGateState = {
  loading: boolean
  allowed: boolean
  reasons: string[]
  requiredTier?: string
  userTier?: string
  fallbackFeatureId?: SpatialFeatureId
  error?: string
}

const PUBLIC_FEATURES = new Set<SpatialFeatureId>([
  'spatial.home.sky',
  'spatial.weather.basic',
  'spatial.starfield.preview',
])

const DEFAULT_ALLOWED: SpatialTierGateState = {
  loading: false,
  allowed: true,
  reasons: [],
}

const DEFAULT_LOADING: SpatialTierGateState = {
  loading: true,
  allowed: false,
  reasons: [],
}

export function useSpatialTierGate(featureId: SpatialFeatureId | null, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled !== false && Boolean(featureId)
  const [state, setState] = useState<SpatialTierGateState>(() => {
    if (!featureId || PUBLIC_FEATURES.has(featureId)) return DEFAULT_ALLOWED
    return DEFAULT_LOADING
  })

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!enabled || !featureId || PUBLIC_FEATURES.has(featureId)) {
        setState(DEFAULT_ALLOWED)
        return
      }

      setState(DEFAULT_LOADING)

      try {
        const callable = httpsCallable(functions, 'evaluateSpatialTierLock')
        const result = await callable({ featureId })
        const data = result.data as {
          allowed?: boolean
          reasons?: string[]
          requiredTier?: string
          userTier?: string
          safeFallbackFeatureId?: SpatialFeatureId
        }

        if (cancelled) return

        setState({
          loading: false,
          allowed: data.allowed === true,
          reasons: data.reasons ?? [],
          requiredTier: data.requiredTier,
          userTier: data.userTier,
          fallbackFeatureId: data.safeFallbackFeatureId,
        })
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Tier gate unavailable'
        setState({
          loading: false,
          allowed: false,
          reasons: ['unavailable'],
          error: message,
          fallbackFeatureId: 'spatial.starfield.preview',
        })
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [enabled, featureId])

  return state
}
