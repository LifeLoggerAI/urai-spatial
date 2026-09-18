'use client'

import { useEffect, useState } from 'react'
import { useSpatialSettingsStore } from '@/spatial/settings/spatialSettingsStore'

export function useReducedMotion() {
  const userReducedMotion = useSpatialSettingsStore((state) => state.reducedMotion)
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return systemReducedMotion || userReducedMotion
}
