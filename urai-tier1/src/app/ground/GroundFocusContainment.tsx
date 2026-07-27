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
      outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        })
      })
    }

    document.addEventListener('focusin', (event) => reveal(event.target), true)
    return () => {
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrame)
      document.removeEventListener('focusin', (event) => reveal(event.target), true)
    }
  }, [])

  return null
}
