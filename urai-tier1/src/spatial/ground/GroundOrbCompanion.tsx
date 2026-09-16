'use client'

import { useLayoutEffect, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { GroundReturnWorldBridge } from './GroundReturnWorldBridge'

const ARRIVAL_X = 0
const ARRIVAL_Z = 6
const DISTANT_LANDMARK_X = 0
const DISTANT_LANDMARK_Z = -205

function relativeDirection(yaw: number, fromX: number, fromZ: number, toX: number, toZ: number) {
  const dx = toX - fromX
  const dz = toZ - fromZ
  const length = Math.hypot(dx, dz) || 1
  const nx = dx / length
  const nz = dz / length
  const forwardX = -Math.sin(yaw)
  const forwardZ = -Math.cos(yaw)
  const rightX = Math.cos(yaw)
  const rightZ = -Math.sin(yaw)
  const forward = nx * forwardX + nz * forwardZ
  const right = nx * rightX + nz * rightZ
  if (forward > .78) return 'ahead'
  if (forward < -.78) return 'behind'
  if (forward > .25 && right > .25) return 'ahead and right'
  if (forward > .25 && right < -.25) return 'ahead and left'
  if (forward < -.25 && right > .25) return 'behind and right'
  if (forward < -.25 && right < -.25) return 'behind and left'
  return right >= 0 ? 'to your right' : 'to your left'
}

/**
 * Ground deliberately renders no follower Orb. This bridge preserves the existing
 * semantic Orb control as a keyboard/screen-reader recovery surface while keeping
 * ordinary first-person Ground visually free of a companion model. It also owns
 * the reverse material/world bridge so Home, Escape, and the visible return action
 * all enter one deterministic return path rather than raw route navigation.
 *
 * Layout effect is deliberate: return capture, hidden semantic Orb state, and the
 * corrected live-region wording are installed before paint so there is no first-
 * frame route or accessibility race with legacy fallback markup.
 */
export function GroundOrbCompanion(props: {
  playerPosition: MutableRefObject<THREE.Vector3>
  yaw: MutableRefObject<number>
  groundHeight: (x: number, z: number) => number
  obstacles: readonly { x: number; z: number; radius: number }[]
  reducedMotion: boolean
}) {
  useLayoutEffect(() => {
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

    let previousNavigation = ''
    const publishRelativeNavigation = () => {
      const position = props.playerPosition.current
      const returnDistanceMeters = Math.round(Math.hypot(position.x - ARRIVAL_X, position.z - ARRIVAL_Z))
      const landmarkDistanceMeters = Math.round(Math.hypot(position.x - DISTANT_LANDMARK_X, position.z - DISTANT_LANDMARK_Z))
      const detail = {
        returnDirection: returnDistanceMeters < 1 ? 'at the arrival area' : relativeDirection(props.yaw.current, position.x, position.z, ARRIVAL_X, ARRIVAL_Z),
        returnDistanceMeters,
        landmarkDirection: relativeDirection(props.yaw.current, position.x, position.z, DISTANT_LANDMARK_X, DISTANT_LANDMARK_Z),
        landmarkDistanceMeters,
      }
      const signature = `${detail.returnDirection}:${detail.returnDistanceMeters}:${detail.landmarkDirection}:${detail.landmarkDistanceMeters}`
      if (signature === previousNavigation) return
      previousNavigation = signature
      window.dispatchEvent(new CustomEvent('urai:ground-relative-navigation', { detail }))
    }

    publishRelativeNavigation()
    const navigationTimer = window.setInterval(publishRelativeNavigation, 1200)
    returnButton?.addEventListener('click', returnThroughWorld, true)
    window.addEventListener('keydown', escapeThroughWorld, { capture: true })

    return () => {
      window.clearInterval(navigationTimer)
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
  }, [props.playerPosition, props.yaw])

  return <GroundReturnWorldBridge groundHeight={props.groundHeight} reducedMotion={props.reducedMotion} />
}

declare global {
  interface WindowEventMap {
    'urai:ground-relative-navigation': CustomEvent<{
      returnDirection: string
      returnDistanceMeters: number
      landmarkDirection: string
      landmarkDistanceMeters: number
    }>
  }
}
