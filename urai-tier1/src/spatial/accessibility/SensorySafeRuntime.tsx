'use client'

import { useEffect } from 'react'

export const URAI_SENSORY_SAFE_STORAGE_KEY = 'urai:sensory-safe:enabled-v1'
export const URAI_SENSORY_SAFE_EVENT = 'urai:sensory-safe-changed'

export function sensorySafeEnabled() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(URAI_SENSORY_SAFE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSensorySafeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(URAI_SENSORY_SAFE_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
  }
  document.documentElement.dataset.uraiSensorySafe = enabled ? 'true' : 'false'
  window.dispatchEvent(new CustomEvent(URAI_SENSORY_SAFE_EVENT, { detail: { enabled } }))
}

export default function SensorySafeRuntime() {
  useEffect(() => {
    const enabled = sensorySafeEnabled()
    document.documentElement.dataset.uraiSensorySafe = enabled ? 'true' : 'false'
    return () => {
      delete document.documentElement.dataset.uraiSensorySafe
    }
  }, [])

  return null
}

declare global {
  interface WindowEventMap {
    [URAI_SENSORY_SAFE_EVENT]: CustomEvent<{ enabled: boolean }>
  }
}
