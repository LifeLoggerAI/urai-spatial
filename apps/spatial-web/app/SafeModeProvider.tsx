'use client'

import { useQualityStore } from '@/engine/core/quality-store'
import { useEffect } from 'react'

export default function SafeModeProvider({ children }: { children: React.ReactNode }) {
  const { setQuality, setSafeMode } = useQualityStore()

  useEffect(() => {
    const crashCount = Number(localStorage.getItem('crashCount') || 0)
    if (crashCount >= 3) {
      console.warn('Entering Safe Mode due to multiple application crashes.')
      setQuality('low')
      setSafeMode(true)
    }
    // A successful render means the app is stable for now, reset the counter.
    localStorage.setItem('crashCount', '0')
  }, [setQuality, setSafeMode])

  return <>{children}</>
}
