'use client'

import { useEffect } from 'react'

export function LocationMapNativeWheelBridge() {
  useEffect(() => {
    const stageFor = (target: EventTarget | null) => target instanceof HTMLElement
      ? target.closest<HTMLElement>('.locationAtlasStage')
      : null

    const handleWheel = (event: WheelEvent) => {
      if (!stageFor(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const label = event.deltaY > 0 ? 'Zoom out' : 'Zoom in'
      document.querySelector<HTMLButtonElement>(`.locationAtlasControls button[aria-label="${label}"]`)?.click()
    }

    const motionStyle = document.createElement('style')
    motionStyle.dataset.locationMapReducedMotionGuard = 'true'
    motionStyle.textContent = '@media (prefers-reduced-motion: reduce){.locationAtlas .locationAtlasBeacon,.locationAtlas .locationAtlasSelection,.locationAtlas .locationAtlasBeacons{transition-property:none!important;transition-duration:0s!important;transition-delay:0s!important;animation-name:none!important;animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important}}'
    document.head.appendChild(motionStyle)

    // Wheel must be captured natively because React delegates wheel listeners as
    // passive in some browser paths. Touch drag and pinch are intentionally owned
    // only by LocationMapScene so every camera mutation updates React state.
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true })
      motionStyle.remove()
    }
  }, [])

  return null
}
