'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import {
  markFirstSpatialFrame,
  useAdaptiveSpatialQuality,
  type SpatialQualityProfile,
} from './useAdaptiveSpatialQuality'

const SpatialPerformanceContext = createContext<SpatialQualityProfile | null>(null)

export function SpatialPerformanceBoundary({ route, children }: { route: string; children: ReactNode }) {
  const profile = useAdaptiveSpatialQuality()

  useEffect(() => {
    if (!profile.documentVisible) return
    const frame = requestAnimationFrame(() => markFirstSpatialFrame(route, profile.tier))
    return () => cancelAnimationFrame(frame)
  }, [profile.documentVisible, profile.tier, route])

  const value = useMemo(() => profile, [profile])

  return (
    <SpatialPerformanceContext.Provider value={value}>
      <div
        data-spatial-quality={profile.tier}
        data-spatial-visible={profile.documentVisible ? 'true' : 'false'}
        style={{ minHeight: '100dvh', contain: 'layout paint size' }}
      >
        {children}
      </div>
    </SpatialPerformanceContext.Provider>
  )
}

export function useSpatialPerformanceProfile() {
  const value = useContext(SpatialPerformanceContext)
  if (!value) throw new Error('useSpatialPerformanceProfile must be used inside SpatialPerformanceBoundary')
  return value
}
