'use client'

import { useEffect } from 'react'

const TARGET_SELECTOR = '.ground-destination-compass :is(a,button)'

export default function GroundFocusContainment() {
  useEffect(() => {
    let outerFrame = 0
    let innerFrame = 0

    const contain = (target: HTMLElement) => {
      const rail = target.closest<HTMLElement>('.ground-destination-compass')
      const entry = target.closest<HTMLElement>('.ground-destination-entry')
      const subject = entry ?? target
      if (!rail) {
        subject.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        return
      }

      const railRect = rail.getBoundingClientRect()
      const subjectRect = subject.getBoundingClientRect()
      const viewport = window.visualViewport
      const viewportLeft = viewport?.offsetLeft ?? 0
      const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth)
      const leftBoundary = Math.max(railRect.left, viewportLeft)
      const rightBoundary = Math.min(railRect.right, viewportRight)
      const padding = 8

      let delta = 0
      if (subjectRect.left < leftBoundary + padding) delta = subjectRect.left - leftBoundary - padding
      else if (subjectRect.right > rightBoundary - padding) delta = subjectRect.right - rightBoundary + padding

      if (delta !== 0) rail.scrollLeft += delta
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }

    const reveal = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || !target.matches(TARGET_SELECTOR)) return
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrame)

      // Focus expansion is synchronous from the user's perspective. Contain the
      // complete destination pair immediately, then remeasure after React/CSS have
      // committed the expanded state across two rendered frames.
      contain(target)
      outerFrame = window.requestAnimationFrame(() => {
        contain(target)
        innerFrame = window.requestAnimationFrame(() => contain(target))
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
