'use client'

import { useEffect, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'

/**
 * Ground deliberately renders no follower Orb. This bridge preserves the existing
 * semantic Orb control as a keyboard/screen-reader recovery surface while keeping
 * ordinary first-person Ground visually free of a companion model. It also binds
 * the visible Home action to the world return state machine instead of bypassing
 * realm continuity with a direct router push.
 */
export function GroundOrbCompanion(_props: {
  playerPosition: MutableRefObject<THREE.Vector3>
  yaw: MutableRefObject<number>
  groundHeight: (x: number, z: number) => number
  obstacles: readonly { x: number; z: number; radius: number }[]
  reducedMotion: boolean
}) {
  useEffect(() => {
    const fallback = document.querySelector<HTMLButtonElement>('.urai-world-companion__orb')
    const liveRegion = document.querySelector<HTMLElement>('.ground-spatial-root [role="status"]')
    const returnButton = document.querySelector<HTMLButtonElement>('.ground-home-return')
    const previous = fallback ? {
      opacity: fallback.style.opacity,
      pointerEvents: fallback.style.pointerEvents,
      transition: fallback.style.transition,
      groundMode: fallback.dataset.groundOrbMode,
      ariaLabel: fallback.getAttribute('aria-label'),
    } : null

    const normalizeStatus = () => {
      if (!liveRegion) return
      liveRegion.textContent = liveRegion.textContent?.replace(
        ' The physical Orb is present in the world.',
        ' UrAi remains available through semantic voice and accessible controls; no follower Orb is rendered.',
      ) ?? ''
    }
    const observer = liveRegion ? new MutationObserver(normalizeStatus) : null
    observer?.observe(liveRegion, { childList: true, characterData: true, subtree: true })
    normalizeStatus()

    const reveal = () => { if (fallback) fallback.style.opacity = '1' }
    const hide = () => { if (fallback) fallback.style.opacity = '0' }
    if (fallback) {
      fallback.dataset.groundOrbMode = 'semantic-invocation-only'
      fallback.setAttribute('aria-label', 'Open UrAi controls')
      fallback.style.opacity = '0'
      fallback.style.pointerEvents = 'none'
      fallback.style.transition = 'opacity 120ms ease'
      fallback.addEventListener('focus', reveal)
      fallback.addEventListener('blur', hide)
    }

    const returnThroughWorld = (event: MouseEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      requestUraiWorldReturn()
    }
    returnButton?.addEventListener('click', returnThroughWorld, true)

    return () => {
      observer?.disconnect()
      returnButton?.removeEventListener('click', returnThroughWorld, true)
      if (!fallback || !previous) return
      fallback.removeEventListener('focus', reveal)
      fallback.removeEventListener('blur', hide)
      fallback.style.opacity = previous.opacity
      fallback.style.pointerEvents = previous.pointerEvents
      fallback.style.transition = previous.transition
      if (previous.ariaLabel) fallback.setAttribute('aria-label', previous.ariaLabel)
      else fallback.removeAttribute('aria-label')
      if (previous.groundMode) fallback.dataset.groundOrbMode = previous.groundMode
      else delete fallback.dataset.groundOrbMode
    }
  }, [])

  return null
}
