'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'

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
  revision: number
  notifyChange: () => void
}

export type DragLookHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
}

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
])

// The motion kernel is called once per rendered frame. Reusing scratch vectors keeps
// locomotion allocation-free while the active realm owns the only motion call.
const MOTION_REQUESTED = new THREE.Vector3()
const MOTION_FORWARD = new THREE.Vector3()
const MOTION_RIGHT = new THREE.Vector3()
const MOTION_NEXT = new THREE.Vector3()

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],button,a,summary'))
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
  const [revision, setRevision] = useState(0)
  const notifyChange = useCallback(() => setRevision((value) => value + 1), [])
  const callbacksRef = useRef({ onEscape, onInteract, onReset })

  useEffect(() => {
    callbacksRef.current = { onEscape, onInteract, onReset }
  }, [onEscape, onInteract, onReset])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (MOVEMENT_KEYS.has(event.code)) {
        keys.current.add(event.code)
        notifyChange()
        event.preventDefault()
        return
      }
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        callbacksRef.current.onInteract?.()
        return
      }
      if (event.code === 'KeyR') {
        callbacksRef.current.onReset?.()
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
      if (keys.current.delete(event.code)) notifyChange()
    }
    const clear = (notify = true) => {
      const changed = keys.current.size > 0 || virtualX.current !== 0 || virtualZ.current !== 0
      keys.current.clear()
      virtualX.current = 0
      virtualZ.current = 0
      if (changed && notify) notifyChange()
    }
    window.addEventListener('keydown', onKeyDown, { passive: false, capture: true })
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
      clear(false)
    }
  }, [enabled, notifyChange])

  return { keys, virtualX, virtualZ, revision, notifyChange }
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
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,summary,[data-movement-ui="true"]')) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* pointer capture is best effort */ }
    onDragState?.(true)
  }, [enabled, onDragState])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    drag.current.x = event.clientX
    drag.current.y = event.clientY
    yaw.current -= dx * sensitivity
    pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sensitivity, minPitch, maxPitch)
  }, [maxPitch, minPitch, pitch, sensitivity, yaw])

  const end = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    drag.current = null
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* browser may already release */ }
    onDragState?.(false)
  }, [onDragState])

  return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end }
}

export function setVirtualMovement(input: MovementInput, x: number, z: number) {
  input.virtualX.current = THREE.MathUtils.clamp(x, -1, 1)
  input.virtualZ.current = THREE.MathUtils.clamp(z, -1, 1)
  input.notifyChange()
}

export function clearVirtualMovement(input: MovementInput) {
  input.virtualX.current = 0
  input.virtualZ.current = 0
  input.notifyChange()
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
  const forwardInput = (input.keys.current.has('KeyW') || input.keys.current.has('ArrowUp') ? 1 : 0)
    - (input.keys.current.has('KeyS') || input.keys.current.has('ArrowDown') ? 1 : 0)
    + -input.virtualZ.current
  const strafeInput = (input.keys.current.has('KeyD') || input.keys.current.has('ArrowRight') ? 1 : 0)
    - (input.keys.current.has('KeyA') || input.keys.current.has('ArrowLeft') ? 1 : 0)
    + input.virtualX.current

  const requested = MOTION_REQUESTED.set(0, 0, 0)
  if (Math.abs(forwardInput) > 0.01 || Math.abs(strafeInput) > 0.01) {
    target.current = null
    const forward = MOTION_FORWARD.set(-Math.sin(yaw), 0, -Math.cos(yaw))
    const right = MOTION_RIGHT.set(Math.cos(yaw), 0, -Math.sin(yaw))
    requested.addScaledVector(forward, forwardInput).addScaledVector(right, strafeInput)
  } else if (target.current) {
    requested.copy(target.current).sub(position).setY(0)
    if (requested.length() <= arrivalRadius) {
      target.current = null
      requested.set(0, 0, 0)
    }
  }

  if (requested.lengthSq() > 0.0001) requested.normalize().multiplyScalar(speed)
  const damping = requested.lengthSq() > 0 ? acceleration : deceleration
  // Preserve real elapsed movement on slow devices without allowing an unbounded
  // background-tab leap. Integrating in 50 ms substeps keeps damping and collision
  // behavior stable instead of discarding all frame time above the old hard clamp.
  let remainingDelta = Math.min(delta, 0.5)
  while (remainingDelta > 0) {
    const stepDelta = Math.min(remainingDelta, 0.05)
    velocity.x = THREE.MathUtils.damp(velocity.x, requested.x, damping, stepDelta)
    velocity.z = THREE.MathUtils.damp(velocity.z, requested.z, damping, stepDelta)

    const next = MOTION_NEXT.copy(position).addScaledVector(velocity, stepDelta)
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
      // These diagnostics are part of the Home interaction contract. Keep them in
      // lockstep with HomeWorldProductionFinal's canonical V66 coordinates so
      // proof, accessibility telemetry, and runtime proximity describe one world.
      const spawnX = 4.45
      const spawnZ = 3.15
      owner.dataset.homeInputOwner = 'window-capture-movement'
      owner.dataset.homeTelemetryOwner = 'embodied-motion-kernel-v66'
      owner.dataset.homeInputReady = 'true'
      const assetsReady = owner.dataset.homeAssetsReady === 'true'
      owner.dataset.homeInteractionReady = assetsReady ? 'true' : 'false'
      owner.dataset.homeReady = 'false'
      owner.dataset.homePlayerX = position.x.toFixed(3)
      owner.dataset.homePlayerZ = position.z.toFixed(3)
      owner.dataset.homeDistance = Math.hypot(position.x - spawnX, position.z - spawnZ).toFixed(3)
      owner.dataset.homeDistanceOrb = Math.hypot(position.x, position.z + 7.25).toFixed(3)
      owner.dataset.homeDistanceGround = Math.hypot(position.x + 5.2, position.z + 8.4).toFixed(3)
      owner.dataset.homeDistanceLifeMap = Math.hypot(position.x - 5.2, position.z + 8.4).toFixed(3)
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
        .urai-mobile-movement{display:grid;position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));z-index:28;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:5px;touch-action:none}
        button{width:48px;height:48px;border:1px solid rgba(207,250,254,.25);border-radius:16px;background:rgba(2,12,26,.68);backdrop-filter:blur(14px);color:#fff;font:800 20px/1 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.28)}button:first-child{grid-column:2}.urai-mobile-movement button:nth-child(2){grid-column:1;grid-row:2}.urai-mobile-movement button:nth-child(3){grid-column:2;grid-row:2}.urai-mobile-movement button:nth-child(4){grid-column:3;grid-row:2}button[data-active="true"],button:focus-visible{background:rgba(35,103,130,.9);outline:3px solid #fff;outline-offset:2px}
        @media(max-width:900px),(pointer:coarse){.urai-mobile-movement{display:grid}}
      `}</style>
    </div>
  )
}
