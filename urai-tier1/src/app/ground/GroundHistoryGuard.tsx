'use client'

import { useEffect, useRef } from 'react'
import {
  GROUND_UNWIND_EVENT,
  requestGroundUnwind,
  type GroundUnwindReason,
} from '@/spatial/world/homeGroundContract'

const BASE_MARKER = 'uraiGroundHistoryBase'
const GUARD_MARKER = 'uraiGroundHistoryGuard'

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],button,a,summary'))
}

export default function GroundHistoryGuard() {
  const guardActive = useRef(false)
  const internallyPoppingGuard = useRef(false)

  useEffect(() => {
    const current = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
    if (!current?.[GUARD_MARKER]) {
      window.history.replaceState({ ...current, [BASE_MARKER]: true }, '', window.location.href)
      window.history.pushState({ ...current, [GUARD_MARKER]: true }, '', window.location.href)
    }
    guardActive.current = true

    const popGuardForSpatialUnwind = () => {
      if (!guardActive.current) return
      guardActive.current = false
      internallyPoppingGuard.current = true
      window.history.back()
    }

    const onUnwind = (event: WindowEventMap[typeof GROUND_UNWIND_EVENT]) => {
      if (event.detail.reason === 'browser-back' || event.detail.reason === 'android-back') return
      popGuardForSpatialUnwind()
    }

    const onPopState = (event: PopStateEvent) => {
      const state = event.state && typeof event.state === 'object' ? event.state : {}
      if (!state?.[BASE_MARKER]) return
      event.stopImmediatePropagation()
      if (internallyPoppingGuard.current) {
        internallyPoppingGuard.current = false
        guardActive.current = false
        return
      }
      guardActive.current = false
      requestGroundUnwind('browser-back')
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape' || isEditableTarget(event.target)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      requestGroundUnwind('escape')
    }

    window.addEventListener(GROUND_UNWIND_EVENT, onUnwind)
    window.addEventListener('popstate', onPopState, true)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener(GROUND_UNWIND_EVENT, onUnwind)
      window.removeEventListener('popstate', onPopState, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  return null
}

export const GROUND_HISTORY_GUARD_MARKERS = {
  base: BASE_MARKER,
  guard: GUARD_MARKER,
} as const
