'use client'

import { useLayoutEffect, type MutableRefObject } from 'react'
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
  useLayoutEffect(() => {
    const liveRegion = document.querySelector<HTMLElement>('.ground-spatial-root [role="status"]')
    let fallback: HTMLButtonElement | null = null
    let previous: {
      opacity: string
      pointerEvents: string
      transition: string
      groundMode: string | undefined
    } | null = null

    const normalizeStatus = () => {
      if (!liveRegion) return
      liveRegion.textContent = liveRegion.textContent?.replace(
        ' The physical Orb is present in the world.',
        ' UrAi remains available through semantic voice and accessible controls; no follower Orb is rendered.',
      ) ?? ''
    }
    const observer = liveRegion ? new MutationObserver(normalizeStatus) : null
    if (liveRegion && observer) {
      observer.observe(liveRegion, { childList: true, characterData: true, subtree: true })
    }
    normalizeStatus()

    const reveal = () => { if (fallback) fallback.style.opacity = '1' }
    const hide = () => { if (fallback) fallback.style.opacity = '0' }
    const restoreFallback = () => {
      if (!fallback || !previous) return
      fallback.removeEventListener('focus', reveal)
      fallback.removeEventListener('blur', hide)
      fallback.style.opacity = previous.opacity
      fallback.style.pointerEvents = previous.pointerEvents
      fallback.style.transition = previous.transition
      if (previous.groundMode) fallback.dataset.groundOrbMode = previous.groundMode
      else delete fallback.dataset.groundOrbMode
      fallback = null
      previous = null
    }
    const attachFallback = () => {
      const candidate = document.querySelector<HTMLButtonElement>('.urai-world-companion__orb')
      if (candidate === fallback) return
      restoreFallback()
      if (!candidate) return
      fallback = candidate
      previous = {
        opacity: candidate.style.opacity,
        pointerEvents: candidate.style.pointerEvents,
        transition: candidate.style.transition,
        groundMode: candidate.dataset.groundOrbMode,
      }
      candidate.dataset.groundOrbMode = 'semantic-invocation-only'
      candidate.style.opacity = '0'
      candidate.style.pointerEvents = 'none'
      candidate.style.transition = 'opacity 120ms ease'
      candidate.addEventListener('focus', reveal)
      candidate.addEventListener('blur', hide)
    }

    attachFallback()
    const fallbackObserver = new MutationObserver(attachFallback)
    fallbackObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer?.disconnect()
      fallbackObserver.disconnect()
      restoreFallback()
    }
  }, [])

  return null
}
