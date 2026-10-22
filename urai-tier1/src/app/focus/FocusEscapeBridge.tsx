'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { shouldHandleRealmEscape } from '@/spatial/world/realmEscapeEligibility.mjs'

export function FocusEscapeBridge() {
  const router = useRouter()

  useEffect(() => {
    function setSceneMode(mode: 'focus' | 'life-map') {
      const stage = document.querySelector('[data-testid="urai-scene-stage"]')
      stage?.setAttribute('data-scene-mode', mode)
    }

    function routeToLifeMap() {
      setSceneMode('life-map')
      // Life Map owns the NEXT deliberate Escape; do not arm auto-Home.
      router.push('/life-map')
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldHandleRealmEscape(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      routeToLifeMap()
    }

    // Focus selection is owned by the current authenticated route, never an
    // unscoped session manifest or a delayed history rewrite.
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [router])

  return null
}
