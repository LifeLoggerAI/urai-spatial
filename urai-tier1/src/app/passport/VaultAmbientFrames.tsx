'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export function VaultAmbientFrames({ enabled, framesPerSecond }: { enabled: boolean; framesPerSecond: number }) {
  const invalidate = useThree(state => state.invalidate)
  useEffect(() => {
    if (!enabled) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const interval = 1000 / Math.max(1, Math.min(30, framesPerSecond))
    const tick = () => {
      if (!active) return
      invalidate()
      timer = setTimeout(tick, interval)
    }
    timer = setTimeout(tick, interval)
    return () => { active = false; clearTimeout(timer) }
  }, [enabled, framesPerSecond, invalidate])
  return null
}
