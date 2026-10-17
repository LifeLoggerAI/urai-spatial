'use client'

import { useEffect, useState } from 'react'
import { URAI_SENSORY_SAFE_EVENT, URAI_SENSORY_SAFE_STORAGE_KEY, sensorySafeEnabled } from '../accessibility/SensorySafeRuntime'

export function useReducedMotion() {
  // Keep the server and first client render identical; read device authority on mount.
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined
    let disposed = false
    let sensorySafe = sensorySafeEnabled() || document.documentElement.dataset.uraiSensorySafe === 'true'
    const update = () => {
      if (!disposed) setReducedMotion(Boolean(query?.matches || sensorySafe))
    }
    const sensoryChange = (event: WindowEventMap[typeof URAI_SENSORY_SAFE_EVENT]) => {
      sensorySafe = typeof event.detail?.enabled === 'boolean' ? event.detail.enabled : sensorySafeEnabled()
      update()
    }
    const storageChange = (event: StorageEvent) => {
      if (event.key !== null && event.key !== URAI_SENSORY_SAFE_STORAGE_KEY) return
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return
      } catch { return }
      sensorySafe = sensorySafeEnabled()
      update()
    }
    update()
    if (query?.addEventListener) query.addEventListener('change', update)
    else query?.addListener(update)
    window.addEventListener(URAI_SENSORY_SAFE_EVENT, sensoryChange)
    window.addEventListener('storage', storageChange)
    return () => {
      disposed = true
      if (query?.removeEventListener) query.removeEventListener('change', update)
      else query?.removeListener(update)
      window.removeEventListener(URAI_SENSORY_SAFE_EVENT, sensoryChange)
      window.removeEventListener('storage', storageChange)
    }
  }, [])
  return reducedMotion
}
