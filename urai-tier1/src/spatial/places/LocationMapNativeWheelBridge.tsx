'use client'

import { useEffect } from 'react'

type Point = { x: number; y: number }
type Camera = { x: number; y: number; zoom: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const spacing = (points: Point[]) => points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)

function currentCamera(atlas: HTMLElement): Camera {
  const style = getComputedStyle(atlas)
  return {
    x: Number.parseFloat(style.getPropertyValue('--atlas-x')) || 0,
    y: Number.parseFloat(style.getPropertyValue('--atlas-y')) || 0,
    zoom: Number.parseFloat(style.getPropertyValue('--atlas-zoom')) || .9,
  }
}

function applyCamera(atlas: HTMLElement, camera: Camera) {
  atlas.style.setProperty('--atlas-x', `${camera.x}px`)
  atlas.style.setProperty('--atlas-y', `${camera.y}px`)
  atlas.style.setProperty('--atlas-zoom', String(camera.zoom))
}

export function LocationMapNativeWheelBridge() {
  useEffect(() => {
    const active = new Map<number, Point>()
    let drag: { point: Point; camera: Camera } | null = null
    let pinch: { distance: number; camera: Camera } | null = null
    let touchDrag: { point: Point; camera: Camera } | null = null
    let touchPinch: { distance: number; camera: Camera } | null = null
    let touchControl: HTMLButtonElement | null = null

    const stageFor = (target: EventTarget | null) => target instanceof HTMLElement ? target.closest<HTMLElement>('.locationAtlasStage') : null
    const blocked = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('button,a,[data-atlas-panel]'))
    const touchPoints = (touches: TouchList): Point[] => Array.from(touches).map(touch => ({ x: touch.clientX, y: touch.clientY }))

    const handleWheel = (event: WheelEvent) => {
      if (!stageFor(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const label = event.deltaY > 0 ? 'Zoom out' : 'Zoom in'
      document.querySelector<HTMLButtonElement>(`.locationAtlasControls button[aria-label="${label}"]`)?.click()
    }

    const handleTouchStart = (event: TouchEvent) => {
      const control = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>('button') : null
      if (control) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        touchControl = control
        return
      }
      if (blocked(event.target)) return
      const stage = stageFor(event.target)
      const atlas = stage?.closest<HTMLElement>('.locationAtlas')
      if (!stage || !atlas) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      touchControl = null
      const points = touchPoints(event.touches)
      if (points.length >= 2) {
        touchPinch = { distance: spacing(points), camera: currentCamera(atlas) }
        touchDrag = null
      } else if (points.length === 1) {
        touchDrag = { point: points[0], camera: currentCamera(atlas) }
        touchPinch = null
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (touchControl) {
        touchControl = null
        return
      }
      if (blocked(event.target)) return
      const stage = stageFor(event.target) || document.querySelector<HTMLElement>('.locationAtlasStage')
      const atlas = stage?.closest<HTMLElement>('.locationAtlas')
      if (!atlas) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const points = touchPoints(event.touches)
      if (points.length >= 2 && touchPinch) {
        const nextDistance = spacing(points)
        if (nextDistance > 0 && touchPinch.distance > 0) {
          applyCamera(atlas, { ...touchPinch.camera, zoom: clamp(touchPinch.camera.zoom * (nextDistance / touchPinch.distance), .7, 1.9) })
        }
        return
      }
      if (points.length === 1) {
        if (!touchDrag) {
          touchPinch = null
          touchDrag = { point: points[0], camera: currentCamera(atlas) }
          return
        }
        applyCamera(atlas, {
          ...touchDrag.camera,
          x: clamp(touchDrag.camera.x + points[0].x - touchDrag.point.x, -360, 360),
          y: clamp(touchDrag.camera.y + points[0].y - touchDrag.point.y, -320, 320),
        })
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchControl && event.touches.length === 0) {
        const control = touchControl
        touchControl = null
        control.click()
        return
      }
      if (blocked(event.target)) return
      const atlas = document.querySelector<HTMLElement>('.locationAtlas')
      const points = touchPoints(event.touches)
      touchPinch = null
      touchDrag = atlas && points.length === 1 ? { point: points[0], camera: currentCamera(atlas) } : null
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || blocked(event.target)) return
      const stage = stageFor(event.target)
      const atlas = stage?.closest<HTMLElement>('.locationAtlas')
      if (!stage || !atlas) return
      active.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const points = [...active.values()]
      if (points.length === 1) {
        drag = { point: points[0], camera: currentCamera(atlas) }
        pinch = null
      } else if (points.length >= 2) {
        pinch = { distance: spacing(points), camera: currentCamera(atlas) }
        drag = null
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !active.has(event.pointerId)) return
      const stage = stageFor(event.target) || document.querySelector<HTMLElement>('.locationAtlasStage')
      const atlas = stage?.closest<HTMLElement>('.locationAtlas')
      if (!atlas) return
      active.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const points = [...active.values()]
      if (points.length >= 2 && pinch) {
        const nextDistance = spacing(points)
        if (nextDistance > 0 && pinch.distance > 0) {
          applyCamera(atlas, { ...pinch.camera, zoom: clamp(pinch.camera.zoom * (nextDistance / pinch.distance), .7, 1.9) })
        }
        return
      }
      if (points.length === 1 && drag) {
        applyCamera(atlas, {
          ...drag.camera,
          x: clamp(drag.camera.x + points[0].x - drag.point.x, -360, 360),
          y: clamp(drag.camera.y + points[0].y - drag.point.y, -320, 320),
        })
      }
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      active.delete(event.pointerId)
      const atlas = document.querySelector<HTMLElement>('.locationAtlas')
      const points = [...active.values()]
      pinch = null
      drag = atlas && points.length === 1 ? { point: points[0], camera: currentCamera(atlas) } : null
    }

    const motionStyle = document.createElement('style')
    motionStyle.dataset.locationMapReducedMotionGuard = 'true'
    motionStyle.textContent = '@media (prefers-reduced-motion: reduce){.locationAtlas .locationAtlasBeacon,.locationAtlas .locationAtlasSelection,.locationAtlas .locationAtlasBeacons{transition-property:none!important;transition-duration:0s!important;transition-delay:0s!important;animation-name:none!important;animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important}}'
    document.head.appendChild(motionStyle)

    document.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false })
    document.addEventListener('touchend', handleTouchEnd, true)
    document.addEventListener('touchcancel', handleTouchEnd, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointermove', handlePointerMove, true)
    document.addEventListener('pointerup', handlePointerEnd, true)
    document.addEventListener('pointercancel', handlePointerEnd, true)
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true })
      document.removeEventListener('touchstart', handleTouchStart, { capture: true })
      document.removeEventListener('touchmove', handleTouchMove, { capture: true })
      document.removeEventListener('touchend', handleTouchEnd, true)
      document.removeEventListener('touchcancel', handleTouchEnd, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointermove', handlePointerMove, true)
      document.removeEventListener('pointerup', handlePointerEnd, true)
      document.removeEventListener('pointercancel', handlePointerEnd, true)
      motionStyle.remove()
    }
  }, [])

  return null
}
