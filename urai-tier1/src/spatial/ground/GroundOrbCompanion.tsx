'use client'

import { useEffect, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { GroundReturnWorldBridge } from './GroundReturnWorldBridge'

/**
 * Ground deliberately renders no follower Orb. This bridge preserves the existing
 * semantic Orb control as a keyboard/screen-reader recovery surface while keeping
 * ordinary first-person Ground visually free of a companion model. It also owns
 * the reverse material/world bridge so Home, Escape, and the visible return action
 * all enter one deterministic return path rather than raw route navigation.
 */
export function GroundOrbCompanion(props: {
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
    if (liveRegion && observer) observer.observe(liveRegion, { childList: true, characterData: true, subtree: true })
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

    const beginReturn = (event?: Event) => {
      if (event) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      const root = document.querySelector<HTMLElement>('[data-testid="urai-ground-lived-world"]')
      if (root?.dataset.groundInputLocked === 'true') return
      requestUraiWorldReturn()
    }
    const returnThroughWorld = (event: MouseEvent) => beginReturn(event)
    const escapeThroughWorld = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const target = event.target
      if (target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"],button,a,summary')) return
      beginReturn(event)
    }

    returnButton?.addEventListener('click', returnThroughWorld, true)
    window.addEventListener('keydown', escapeThroughWorld, { capture: true })

    return () => {
      observer?.disconnect()
      returnButton?.removeEventListener('click', returnThroughWorld, true)
      window.removeEventListener('keydown', escapeThroughWorld, true)
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

  return <GroundReturnWorldBridge groundHeight={props.groundHeight} reducedMotion={props.reducedMotion} />
}
