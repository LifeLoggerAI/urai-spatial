'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { shouldHandleRealmEscape } from '@/spatial/world/realmEscapeEligibility.mjs'

const DEFAULT_REPLAY_MANIFEST_ID = 'seed-memory-bloom'

function focusUrlForManifest(manifestId: string) {
  return `/focus?manifestId=${encodeURIComponent(manifestId)}`
}

export function FocusEscapeBridge() {
  const router = useRouter()

  useEffect(() => {
    function setSceneMode(mode: 'focus' | 'life-map') {
      const stage = document.querySelector('[data-testid="urai-scene-stage"]')
      stage?.setAttribute('data-scene-mode', mode)
    }

    function getReplayReturnManifest() {
      return window.sessionStorage.getItem('urai-replay-return-manifest-id') || DEFAULT_REPLAY_MANIFEST_ID
    }

    function routeToSeedFocus() {
      const manifestId = getReplayReturnManifest()
      const target = focusUrlForManifest(manifestId)
      setSceneMode('focus')
      window.history.replaceState(null, '', target)
      window.dispatchEvent(new PopStateEvent('popstate'))
      router.replace(target)
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

    const searchParams = new URLSearchParams(window.location.search)
    const hasFocusTarget = searchParams.has('manifestId') || searchParams.has('memoryId') || searchParams.has('nodeId')
    const shouldRestoreReplayFocus =
      window.location.pathname === '/focus' &&
      !hasFocusTarget &&
      Boolean(window.sessionStorage.getItem('urai-replay-return-manifest-id'))

    const fallbackTimer = shouldRestoreReplayFocus
      ? window.setTimeout(() => {
          routeToSeedFocus()
        }, 800)
      : undefined

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [router])

  return null
}
