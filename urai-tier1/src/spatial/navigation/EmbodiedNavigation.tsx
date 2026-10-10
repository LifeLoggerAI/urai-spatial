'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'
import { cameraDampingAlpha, cameraFrameDelta } from '../canon/cameraMotion'

export type MovementBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type MovementObstacle = {
  x: number
  z: number
  radius: number
}

export type MovementInput = {
  keys: MutableRefObject<Set<string>>
  virtualX: MutableRefObject<number>
  virtualZ: MutableRefObject<number>
}

export type DragLookHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void
}

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
])

export const URAI_EMBODIED_MOVEMENT_INPUT_EVENT = 'urai:embodied-movement-input'

function notifyMovementInputChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(URAI_EMBODIED_MOVEMENT_INPUT_EVENT))
}

// The motion kernel is called once per rendered frame. Reusing scratch vectors keeps
// locomotion allocation-free while the active realm owns the only motion call.
const MOTION_REQUESTED = new THREE.Vector3()
const MOTION_FORWARD = new THREE.Vector3()
const MOTION_RIGHT = new THREE.Vector3()
const MOTION_NEXT = new THREE.Vector3()

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && (
    (target instanceof HTMLElement && target.isContentEditable) ||
    Boolean(target.closest('input,textarea,select,[role="textbox"],[contenteditable="true"],button,a,summary'))
  )
}

export function useMovementInput({
  enabled = true,
  onEscape,
  onInteract,
  onReset,
}: {
  enabled?: boolean
  onEscape?: () => void
  onInteract?: () => void
  onReset?: () => void
} = {}): MovementInput {
  const keys = useRef(new Set<string>())
  const virtualX = useRef(0)
  const virtualZ = useRef(0)
  const callbacksRef = useRef({ onEscape, onInteract, onReset })

  useEffect(() => {
    callbacksRef.current = { onEscape, onInteract, onReset }
  }, [onEscape, onInteract, onReset])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const editableTarget = isEditableTarget(event.target)
      const movementControl = event.target instanceof Element && Boolean(event.target.closest('[data-movement-ui="true"]'))
      if (MOVEMENT_KEYS.has(event.code)) {
        if (editableTarget && !movementControl) return
        keys.current.add(event.code)
        notifyMovementInputChanged()
        event.preventDefault()
        return
      }
      if (editableTarget) return
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat) callbacksRef.current.onInteract?.()
        return
      }
      if (event.code === 'KeyR') {
        if (!event.repeat) callbacksRef.current.onReset?.()
        return
      }
      if (event.code === 'Escape' && callbacksRef.current.onEscape) {
        event.preventDefault()
        event.stopImmediatePropagation()
        callbacksRef.current.onEscape()
        return
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (keys.current.delete(event.code)) notifyMovementInputChanged()
    }
    const clear = () => {
      const hadMovement = keys.current.size > 0 || virtualX.current !== 0 || virtualZ.current !== 0
      keys.current.clear()
      virtualX.current = 0
      virtualZ.current = 0
      if (hadMovement) notifyMovementInputChanged()
    }
    window.addEventListener('keydown', onKeyDown, { passive: false, capture: true })
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    window.addEventListener('pagehide', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      window.removeEventListener('pagehide', clear)
      document.removeEventListener('visibilitychange', clear)
      clear()
    }
  }, [enabled])

  return { keys, virtualX, virtualZ }
}

export function useDragLook({
  yaw,
  pitch,
  enabled = true,
  sensitivity = 0.004,
  minPitch = -0.58,
  maxPitch = 0.5,
  onDragState,
}: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  enabled?: boolean
  sensitivity?: number
  minPitch?: number
  maxPitch?: number
  onDragState?: (dragging: boolean) => void
}): DragLookHandlers {
  const drag = useRef<{ pointerId: number; x: number; y: number; started: boolean; owner: HTMLElement } | null>(null)

  const clear = useCallback(() => {
    const current = drag.current
    if (!current) return
    drag.current = null
    if (!current.started) return
    try { current.owner.releasePointerCapture(current.pointerId) } catch { /* browser may already release */ }
    onDragState?.(false)
  }, [onDragState])

  useEffect(() => {
    if (!enabled) { clear(); return }
    const clearWhenHidden = () => { if (document.visibilityState === 'hidden') clear() }
    const clearMatchingPointer = (event: PointerEvent) => { if (drag.current?.pointerId === event.pointerId) clear() }
    window.addEventListener('blur', clear)
    window.addEventListener('pagehide', clear)
    window.addEventListener('pointerup', clearMatchingPointer)
    window.addEventListener('pointercancel', clearMatchingPointer)
    document.addEventListener('visibilitychange', clearWhenHidden)
    return () => {
      window.removeEventListener('blur', clear)
      window.removeEventListener('pagehide', clear)
      window.removeEventListener('pointerup', clearMatchingPointer)
      window.removeEventListener('pointercancel', clearMatchingPointer)
      document.removeEventListener('visibilitychange', clearWhenHidden)
      clear()
    }
  }, [clear, enabled])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0 || event.isPrimary === false || drag.current) return
    if (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,summary,[data-movement-ui="true"]')) return
    // Keep click/tap ownership with the actual Three hit target. Capture only
    // after the same six-pixel movement tolerance used by Home sky interaction.
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: false, owner: event.currentTarget }
  }, [enabled])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || !drag.current || drag.current.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (!drag.current.started) {
      if (Math.hypot(dx, dy) <= 6) return
      drag.current.started = true
      try { drag.current.owner.setPointerCapture(event.pointerId) } catch { /* capture is best effort */ }
      onDragState?.(true)
    }
    drag.current.x = event.clientX
    drag.current.y = event.clientY
    yaw.current -= dx * sensitivity
    pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sensitivity, minPitch, maxPitch)
  }, [enabled, maxPitch, minPitch, onDragState, pitch, sensitivity, yaw])

  const end = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    clear()
  }, [clear])

  return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end }
}

export function setVirtualMovement(input: MovementInput, x: number, z: number) {
  input.virtualX.current = THREE.MathUtils.clamp(x, -1, 1)
  input.virtualZ.current = THREE.MathUtils.clamp(z, -1, 1)
  notifyMovementInputChanged()
}

export function clearVirtualMovement(input: MovementInput) {
  const hadMovement = input.virtualX.current !== 0 || input.virtualZ.current !== 0
  input.virtualX.current = 0
  input.virtualZ.current = 0
  if (hadMovement) notifyMovementInputChanged()
}

export function stepEmbodiedMotion({
  position,
  velocity,
  input,
  target,
  yaw,
  delta,
  speed,
  acceleration,
  deceleration,
  bounds,
  obstacles = [],
  arrivalRadius = 0.28,
}: {
  position: THREE.Vector3
  velocity: THREE.Vector3
  input: MovementInput
  target: MutableRefObject<THREE.Vector3 | null>
  yaw: number
  delta: number
  speed: number
  acceleration: number
  deceleration: number
  bounds: MovementBounds
  obstacles?: MovementObstacle[]
  arrivalRadius?: number
}) {
  const virtualX = Number.isFinite(input.virtualX.current) ? THREE.MathUtils.clamp(input.virtualX.current, -1, 1) : 0
  const virtualZ = Number.isFinite(input.virtualZ.current) ? THREE.MathUtils.clamp(input.virtualZ.current, -1, 1) : 0
  const forwardInput = (input.keys.current.has('KeyW') || input.keys.current.has('ArrowUp') ? 1 : 0)
    - (input.keys.current.has('KeyS') || input.keys.current.has('ArrowDown') ? 1 : 0)
    + -virtualZ
  const strafeInput = (input.keys.current.has('KeyD') || input.keys.current.has('ArrowRight') ? 1 : 0)
    - (input.keys.current.has('KeyA') || input.keys.current.has('ArrowLeft') ? 1 : 0)
    + virtualX

  const finiteYaw = Number.isFinite(yaw) ? yaw : 0
  const finiteSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0
  const finiteArrivalRadius = Number.isFinite(arrivalRadius) ? Math.max(0, arrivalRadius) : 0.28
  const requested = MOTION_REQUESTED.set(0, 0, 0)
  if (Math.abs(forwardInput) > 0.01 || Math.abs(strafeInput) > 0.01) {
    target.current = null
    const forward = MOTION_FORWARD.set(-Math.sin(finiteYaw), 0, -Math.cos(finiteYaw))
    const right = MOTION_RIGHT.set(Math.cos(finiteYaw), 0, -Math.sin(finiteYaw))
    requested.addScaledVector(forward, forwardInput).addScaledVector(right, strafeInput)
  } else if (target.current) {
    if (!Number.isFinite(target.current.x) || !Number.isFinite(target.current.z)) {
      target.current = null
    } else {
      requested.copy(target.current).sub(position).setY(0)
      if (requested.length() <= finiteArrivalRadius) {
        target.current = null
        requested.set(0, 0, 0)
      }
    }
  }

  if (requested.lengthSq() > 0.0001) requested.normalize().multiplyScalar(finiteSpeed)
  if (!Number.isFinite(velocity.x)) velocity.x = 0
  if (!Number.isFinite(velocity.y)) velocity.y = 0
  if (!Number.isFinite(velocity.z)) velocity.z = 0
  // Preserve real elapsed movement on slow devices without allowing an unbounded
  // background-tab leap. Substeps retain collision checks, while integrating the
  // exponential velocity exactly avoids distance changing with refresh rate.
  let remainingDelta = cameraFrameDelta(delta, 0.5)
  while (remainingDelta > 0) {
    const stepDelta = Math.min(remainingDelta, 0.05)
    // Guided movement must observe arrival during a slow frame too, rather than
    // spending all substeps travelling in the direction sampled at frame start.
    if (target.current) {
      requested.copy(target.current).sub(position).setY(0)
      if (requested.length() <= finiteArrivalRadius) {
        target.current = null
        requested.set(0, 0, 0)
      } else {
        requested.normalize().multiplyScalar(finiteSpeed)
      }
    }
    const requestedDamping = requested.lengthSq() > 0 ? acceleration : deceleration
    const damping = Number.isFinite(requestedDamping) ? Math.max(0, requestedDamping) : 0
    const alpha = cameraDampingAlpha(damping, stepDelta)
    const integral = damping > 0 ? alpha / damping : stepDelta
    const stepX = requested.x * stepDelta + (velocity.x - requested.x) * integral
    const stepZ = requested.z * stepDelta + (velocity.z - requested.z) * integral
    velocity.x = THREE.MathUtils.damp(velocity.x, requested.x, damping, stepDelta)
    velocity.z = THREE.MathUtils.damp(velocity.z, requested.z, damping, stepDelta)

    const next = MOTION_NEXT.copy(position)
    next.x += stepX
    next.y += velocity.y * stepDelta
    next.z += stepZ
    next.x = THREE.MathUtils.clamp(next.x, bounds.minX, bounds.maxX)
    next.z = THREE.MathUtils.clamp(next.z, bounds.minZ, bounds.maxZ)

    for (const obstacle of obstacles) {
      const dx = next.x - obstacle.x
      const dz = next.z - obstacle.z
      const distance = Math.hypot(dx, dz)
      if (distance >= obstacle.radius || distance === 0) continue
      const scale = obstacle.radius / distance
      next.x = obstacle.x + dx * scale
      next.z = obstacle.z + dz * scale
    }

    position.copy(next)
    remainingDelta -= stepDelta
  }

  const moving = velocity.lengthSq() > 0.0025
  if (typeof document !== 'undefined') {
    const owner = document.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    if (owner) {
      const spawnX = -0.85
      const spawnZ = 8.4
      owner.dataset.homeInputOwner = 'window-capture-movement'
      owner.dataset.homeTelemetryOwner = 'embodied-motion-kernel'
      owner.dataset.homeInputReady = 'true'
      const assetsReady = owner.dataset.homeAssetsReady === 'true'
      owner.dataset.homeInteractionReady = assetsReady ? 'true' : 'false'
      owner.dataset.homeReady = 'false'
      owner.dataset.homePlayerX = position.x.toFixed(3)
      owner.dataset.homePlayerZ = position.z.toFixed(3)
      owner.dataset.homeDistance = Math.hypot(position.x - spawnX, position.z - spawnZ).toFixed(3)
      owner.dataset.homeDistanceOrb = Math.hypot(position.x - 1.8, position.z + 9.5).toFixed(3)
      owner.dataset.homeDistanceGround = Math.hypot(position.x + 5.4, position.z + 10.8).toFixed(3)
      owner.dataset.homeDistanceLifeMap = Math.hypot(position.x - 5.4, position.z + 10.8).toFixed(3)
      owner.dataset.homeMoving = moving ? 'true' : 'false'
      owner.dataset.homePressedKeys = [...input.keys.current].sort().join(',')
      owner.dataset.homeMovementVector = `${strafeInput.toFixed(3)},${forwardInput.toFixed(3)}`
      const renderedFrames = Number.parseInt(owner.dataset.homeRenderedFrames || '0', 10)
      const nextRenderedFrames = Number.isFinite(renderedFrames) ? renderedFrames + 1 : 1
      owner.dataset.homeRenderedFrames = String(nextRenderedFrames)
      owner.dataset.homeReady = assetsReady && nextRenderedFrames >= 3 ? 'true' : 'false'
    }
  }

  return {
    moving,
    hasTarget: target.current !== null,
  }
}

export function MovementHelp({
  realm,
  summary,
  controls,
}: {
  realm: string
  summary: string
  controls: string
}) {
  return (
    <details className="urai-movement-help" data-movement-ui="true">
      <summary>Move through {realm}</summary>
      <p>{summary}</p>
      <span>{controls}</span>
      <style jsx>{`
        .urai-movement-help{position:absolute;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:30;max-width:min(310px,calc(100vw - 32px));border:1px solid rgba(198,244,255,.2);border-radius:16px;background:rgba(2,10,22,.72);box-shadow:0 18px 60px rgba(0,0,0,.42);backdrop-filter:blur(18px);color:rgba(239,250,255,.88);font:600 12px/1.45 Inter,ui-sans-serif,system-ui}
        summary{min-height:48px;display:flex;align-items:center;padding:0 16px;cursor:pointer;list-style:none;letter-spacing:.04em}summary::-webkit-details-marker{display:none}
        p,span{display:block;margin:0;padding:0 16px 12px}span{color:rgba(189,232,247,.66);font-size:11px}
        summary:focus-visible{outline:3px solid #fff;outline-offset:3px;border-radius:14px}
        @media(max-width:700px){.urai-movement-help{top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));max-width:250px}.urai-movement-help:not([open]){opacity:.72}}
      `}</style>
    </details>
  )
}

export function MobileMovementPad({ input, label }: { input: MovementInput; label: string }) {
  const [active, setActive] = useState<string | null>(null)
  const press = (direction: 'forward' | 'back' | 'left' | 'right') => {
    setActive(direction)
    if (direction === 'forward') setVirtualMovement(input, 0, -1)
    if (direction === 'back') setVirtualMovement(input, 0, 1)
    if (direction === 'left') setVirtualMovement(input, -1, 0)
    if (direction === 'right') setVirtualMovement(input, 1, 0)
  }
  const release = () => {
    setActive(null)
    clearVirtualMovement(input)
  }
  return (
    <div className="urai-mobile-movement" data-movement-ui="true" role="group" aria-label={label}>
      <button type="button" aria-label="Move forward" data-active={active === 'forward'} onPointerDown={() => press('forward')} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>↑</button>
      <button type="button" aria-label="Move left" data-active={active === 'left'} onPointerDown={() => press('left')} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>←</button>
      <button type="button" aria-label="Move backward" data-active={active === 'back'} onPointerDown={() => press('back')} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>↓</button>
      <button type="button" aria-label="Move right" data-active={active === 'right'} onPointerDown={() => press('right')} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>→</button>
      <style jsx>{`
        .urai-mobile-movement{display:none;position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));z-index:28;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:5px;pointer-events:none}
        button{width:48px;height:48px;pointer-events:auto;touch-action:none;border:1px solid rgba(207,250,254,.25);border-radius:16px;background:rgba(2,12,26,.68);backdrop-filter:blur(14px);color:#fff;font:800 20px/1 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.28)}button:first-child{grid-column:2}.urai-mobile-movement button:nth-child(2){grid-column:1;grid-row:2}.urai-mobile-movement button:nth-child(3){grid-column:2;grid-row:2}.urai-mobile-movement button:nth-child(4){grid-column:3;grid-row:2}button[data-active="true"],button:focus-visible{background:rgba(35,103,130,.9);outline:3px solid #fff;outline-offset:2px}
        @media(max-width:900px),(pointer:coarse){.urai-mobile-movement{display:grid}}
      `}</style>
    </div>
  )
}
