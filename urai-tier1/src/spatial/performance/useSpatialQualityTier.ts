'use client'

import { useEffect, useState } from 'react'

export type SpatialQualityTier = 'hero' | 'balanced' | 'mobile'

export type SpatialQualityProfile = {
  tier: SpatialQualityTier
  dpr: [number, number]
  realtimeShadows: boolean
  shadowMapSize: number
  contactShadows: boolean
  environmentIntensity: number
  maxAnisotropyHint: number
}

const PROFILES: Record<SpatialQualityTier, SpatialQualityProfile> = {
  hero: {
    tier: 'hero',
    dpr: [1, 1.75],
    realtimeShadows: true,
    shadowMapSize: 2048,
    contactShadows: true,
    environmentIntensity: 0.3,
    maxAnisotropyHint: 8,
  },
  balanced: {
    tier: 'balanced',
    dpr: [0.9, 1.35],
    realtimeShadows: true,
    shadowMapSize: 1024,
    contactShadows: true,
    environmentIntensity: 0.24,
    maxAnisotropyHint: 4,
  },
  mobile: {
    tier: 'mobile',
    dpr: [0.8, 1.05],
    realtimeShadows: false,
    shadowMapSize: 768,
    contactShadows: false,
    environmentIntensity: 0.2,
    maxAnisotropyHint: 2,
  },
}

function forcedTier(): SpatialQualityTier | null {
  const raw = process.env.NEXT_PUBLIC_URAI_SPATIAL_QUALITY
  return raw === 'hero' || raw === 'balanced' || raw === 'mobile' ? raw : null
}

function detectTier(): SpatialQualityTier {
  const forced = forcedTier()
  if (forced) return forced
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'balanced'

  const nav = navigator as Navigator & { deviceMemory?: number }
  const memory = nav.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const compact = Math.min(window.innerWidth, window.innerHeight) < 760
  const highDpr = window.devicePixelRatio > 2.25

  if (coarse && (memory <= 4 || cores <= 6 || compact || highDpr)) return 'mobile'
  if (!coarse && memory >= 8 && cores >= 8 && window.innerWidth >= 1100) return 'hero'
  if (memory <= 3 || cores <= 4) return 'mobile'
  return 'balanced'
}

export function useSpatialQualityTier() {
  const [profile, setProfile] = useState<SpatialQualityProfile>(PROFILES.balanced)

  useEffect(() => {
    const update = () => setProfile(PROFILES[detectTier()])
    update()
    const pointer = window.matchMedia?.('(pointer: coarse)')
    pointer?.addEventListener?.('change', update)
    window.addEventListener('resize', update)
    return () => {
      pointer?.removeEventListener?.('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return profile
}
