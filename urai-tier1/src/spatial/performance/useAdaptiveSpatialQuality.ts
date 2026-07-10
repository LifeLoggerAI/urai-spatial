'use client'

import { useEffect, useMemo, useState } from 'react'

export type SpatialQualityTier = 'low' | 'medium' | 'high'

export type SpatialQualityProfile = {
  tier: SpatialQualityTier
  pixelRatioMax: number
  particleCount: number
  shadows: boolean
  postprocessing: boolean
  antialias: boolean
  preloadSecondaryWorlds: boolean
  reducedMotion: boolean
  documentVisible: boolean
}

type NavigatorHints = Navigator & {
  deviceMemory?: number
  connection?: {
    effectiveType?: string
    saveData?: boolean
    addEventListener?: (type: string, listener: () => void) => void
    removeEventListener?: (type: string, listener: () => void) => void
  }
}

const PROFILE = {
  low: {
    pixelRatioMax: 1,
    particleCount: 120,
    shadows: false,
    postprocessing: false,
    antialias: false,
    preloadSecondaryWorlds: false,
  },
  medium: {
    pixelRatioMax: 1.35,
    particleCount: 180,
    shadows: true,
    postprocessing: false,
    antialias: true,
    preloadSecondaryWorlds: false,
  },
  high: {
    pixelRatioMax: 1.75,
    particleCount: 520,
    shadows: true,
    postprocessing: true,
    antialias: true,
    preloadSecondaryWorlds: true,
  },
} as const

function deriveTier(reducedMotion: boolean): SpatialQualityTier {
  if (typeof window === 'undefined') return 'medium'

  const navigatorHints = navigator as NavigatorHints
  const memory = navigatorHints.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  const effectiveType = navigatorHints.connection?.effectiveType ?? '4g'
  const saveData = navigatorHints.connection?.saveData ?? false
  const narrow = window.matchMedia('(max-width: 760px)').matches
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches

  if (
    reducedMotion ||
    saveData ||
    memory <= 2 ||
    cores <= 2 ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g'
  ) return 'low'

  if (narrow || coarsePointer || memory <= 4 || cores <= 4 || effectiveType === '3g') return 'medium'
  return 'high'
}

export function useAdaptiveSpatialQuality(): SpatialQualityProfile {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(true)
  const [tier, setTier] = useState<SpatialQualityTier>('medium')

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 760px)')
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    const connection = (navigator as NavigatorHints).connection

    const updateMotion = () => setReducedMotion(motion.matches)
    const updateVisibility = () => setDocumentVisible(document.visibilityState === 'visible')
    const updateTier = () => setTier(deriveTier(motion.matches))

    updateMotion()
    updateVisibility()
    updateTier()

    motion.addEventListener('change', updateMotion)
    motion.addEventListener('change', updateTier)
    narrow.addEventListener('change', updateTier)
    coarsePointer.addEventListener('change', updateTier)
    document.addEventListener('visibilitychange', updateVisibility)
    connection?.addEventListener?.('change', updateTier)

    return () => {
      motion.removeEventListener('change', updateMotion)
      motion.removeEventListener('change', updateTier)
      narrow.removeEventListener('change', updateTier)
      coarsePointer.removeEventListener('change', updateTier)
      document.removeEventListener('visibilitychange', updateVisibility)
      connection?.removeEventListener?.('change', updateTier)
    }
  }, [])

  return useMemo(() => ({
    tier,
    ...PROFILE[tier],
    reducedMotion,
    documentVisible,
  }), [documentVisible, reducedMotion, tier])
}

export function markFirstSpatialFrame(route: string, tier: SpatialQualityTier) {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return
  if (performance.getEntriesByName('urai:first-spatial-frame').length > 0) return

  performance.mark('urai:first-spatial-frame')
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const elapsedMs = navigation ? performance.now() - navigation.startTime : performance.now()

  window.dispatchEvent(new CustomEvent('urai:spatial-performance', {
    detail: {
      event: 'first-spatial-frame',
      route,
      tier,
      elapsedMs: Math.round(elapsedMs),
    },
  }))
}
