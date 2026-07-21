'use client'

import { useEffect } from 'react'

export function LocationMapNativeWheelBridge() {
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.closest('.locationAtlasStage')) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const label = event.deltaY > 0 ? 'Zoom out' : 'Zoom in'
      const control = document.querySelector<HTMLButtonElement>(`.locationAtlasControls button[aria-label="${label}"]`)
      control?.click()
    }
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    return () => document.removeEventListener('wheel', handleWheel, { capture: true })
  }, [])

  return null
}
