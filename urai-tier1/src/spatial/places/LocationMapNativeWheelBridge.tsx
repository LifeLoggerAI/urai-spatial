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

    const handleHome = (event: KeyboardEvent) => {
      const atlas = document.querySelector<HTMLElement>('.locationAtlas')
      if (event.key !== 'Home' || !atlas?.querySelector('.locationAtlasStage')) return
      const target = event.target
      if (target instanceof HTMLElement && target.matches('input,textarea,select,[contenteditable="true"]')) return
      const overview = atlas.querySelector<HTMLButtonElement>('.locationAtlasControls button[aria-label="Return to atlas overview"]')
      if (!overview) return

      event.preventDefault()

      // A retained sample atlas can be open from localStorage before demo=1 is present
      // in the URL. Normalize that same-route state before the overview action so the
      // router does not remount the atlas between camera reset and the next native tap.
      if (!atlas.querySelector('.locationAtlasSelection') && atlas.dataset.locationMapSource === 'disclosed-demo') {
        const url = new URL(window.location.href)
        if (url.searchParams.get('demo') !== '1') {
          url.searchParams.set('demo', '1')
          window.history.replaceState(window.history.state, '', url)
        }
      }

      overview.click()
    }

    const motionStyle = document.createElement('style')
    motionStyle.dataset.locationMapReducedMotionGuard = 'true'
    motionStyle.textContent = '@media (prefers-reduced-motion: reduce){.locationAtlas .locationAtlasBeacon,.locationAtlas .locationAtlasSelection,.locationAtlas .locationAtlasBeacons{transition-property:none!important;transition-duration:0s!important;transition-delay:0s!important;animation-name:none!important;animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important}}'
    document.head.appendChild(motionStyle)

    // Wheel must be captured natively because React delegates wheel listeners as passive in some browser paths.
    // Touch drag and pinch are intentionally owned only by LocationMapScene so every camera mutation updates React state.
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    document.addEventListener('keydown', handleHome, true)
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true })
      document.removeEventListener('keydown', handleHome, true)
      motionStyle.remove()
    }
  }, [])

  return null
}
