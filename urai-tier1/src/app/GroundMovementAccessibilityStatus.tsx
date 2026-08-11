'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])

export default function GroundMovementAccessibilityStatus() {
  const pathname = usePathname() ?? '/'
  const active = pathname.replace(/\/+$/, '') === '/ground'
  const keyboard = useRef(new Set<string>())
  const pointerMovement = useRef(0)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    if (!active) {
      keyboard.current.clear()
      pointerMovement.current = 0
      setMoving(false)
      return
    }

    const synchronize = () => setMoving(keyboard.current.size > 0 || pointerMovement.current > 0)
    const keyDown = (event: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(event.code)) return
      keyboard.current.add(event.code)
      synchronize()
    }
    const keyUp = (event: KeyboardEvent) => {
      keyboard.current.delete(event.code)
      synchronize()
    }
    const pointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-movement-ui="true"] button, .urai-mobile-movement button') : null
      if (!target) return
      pointerMovement.current += 1
      synchronize()
    }
    const pointerEnd = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-movement-ui="true"] button, .urai-mobile-movement button')) return
      pointerMovement.current = Math.max(0, pointerMovement.current - 1)
      synchronize()
    }
    const clear = () => {
      keyboard.current.clear()
      pointerMovement.current = 0
      synchronize()
    }

    window.addEventListener('keydown', keyDown, true)
    window.addEventListener('keyup', keyUp, true)
    window.addEventListener('pointerdown', pointerDown, true)
    window.addEventListener('pointerup', pointerEnd, true)
    window.addEventListener('pointercancel', pointerEnd, true)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', keyDown, true)
      window.removeEventListener('keyup', keyUp, true)
      window.removeEventListener('pointerdown', pointerDown, true)
      window.removeEventListener('pointerup', pointerEnd, true)
      window.removeEventListener('pointercancel', pointerEnd, true)
      window.removeEventListener('blur', clear)
    }
  }, [active])

  if (!active) return null
  return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-ground-movement-status>{moving ? 'Moving through Ground' : 'Ground movement ready'}</p>
}
