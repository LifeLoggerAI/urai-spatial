'use client'

import { useEffect, type MutableRefObject } from 'react'
import * as THREE from 'three'

/**
 * Ground deliberately renders no follower Orb. This bridge preserves the existing
 * semantic Orb control as a keyboard/screen-reader recovery surface while keeping
 * ordinary first-person Ground visually free of a companion model.
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
    const previous = fallback ? {
      opacity: fallback.style.opacity,
      pointerEvents: fallback.style.pointerEvents,
      transition: fallback.style.transition,
      groundMode: fallback.dataset.groundOrbMode,
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
      fallback.style.opacity = '0'
      fallback.style.pointerEvents = 'none'
      fallback.style.transition = 'opacity 120ms ease'
      fallback.addEventListener('focus', reveal)
      fallback.addEventListener('blur', hide)
    }

    return () => {
      observer?.disconnect()
      if (!fallback || !previous) return
      fallback.removeEventListener('focus', reveal)
      fallback.removeEventListener('blur', hide)
      fallback.style.opacity = previous.opacity
      fallback.style.pointerEvents = previous.pointerEvents
      fallback.style.transition = previous.transition
      if (previous.groundMode) fallback.dataset.groundOrbMode = previous.groundMode
      else delete fallback.dataset.groundOrbMode
    }
  }, [])

  return null
}
