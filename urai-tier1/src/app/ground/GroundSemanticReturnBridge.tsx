'use client'

import { useEffect } from 'react'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'))
}

/**
 * Ground return is a semantic world transition, not a raw route escape.
 * Capture ownership keeps both the visible Home action and keyboard Escape on the
 * same reverse-travel authority before legacy/fallback handlers can bypass state,
 * camera-checkpoint or transition continuity.
 */
export default function GroundSemanticReturnBridge() {
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.ground-home-return')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      requestUraiWorldReturn()
    }

    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isEditableTarget(event.target)) return
      const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
      if (pathname !== '/ground') return
      event.preventDefault()
      event.stopImmediatePropagation()
      requestUraiWorldReturn()
    }

    document.addEventListener('click', onClickCapture, true)
    window.addEventListener('keydown', onKeyDownCapture, true)
    return () => {
      document.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('keydown', onKeyDownCapture, true)
    }
  }, [])

  return null
}
