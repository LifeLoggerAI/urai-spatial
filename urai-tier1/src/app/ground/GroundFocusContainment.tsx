'use client'

import { useEffect } from 'react'

const TARGET_SELECTOR = '.ground-destination-compass :is(a,button)'

export default function GroundFocusContainment() {
  useEffect(() => {
    let outerFrame = 0
    let innerFrame = 0

    const reveal = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || !target.matches(TARGET_SELECTOR)) return
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrame)

      // Focus can expand the Guide control before React and CSS finish layout.
      // Bring the complete destination pair into the rail synchronously, then
      // repeat against the focused control after two rendered frames.
      const entry = target.closest<HTMLElement>('.ground-destination-entry')
      ;(entry ?? target).scrollIntoView({ block: 'nearest', inline: 'nearest' })
      outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => {
          ;(entry ?? target).scrollIntoView({ block: 'nearest', inline: 'nearest' })
          target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        })
      })
    }
    const onFocusIn = (event: FocusEvent) => reveal(event.target)

    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrame)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [])

  return null
}
