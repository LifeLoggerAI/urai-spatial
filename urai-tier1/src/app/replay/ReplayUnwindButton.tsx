'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ReplayUnwindButton() {
  const router = useRouter()

  useEffect(() => {
    function routeToFocus() {
      const stage = document.querySelector('[data-testid="urai-scene-stage"]')
      stage?.setAttribute('data-scene-mode', 'focus')
      router.push('/focus')
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      routeToFocus()
    }

    const directReplayFallback = window.location.pathname === '/replay' && !window.location.search.includes('manifestId=')
    const fallbackTimer = directReplayFallback ? window.setTimeout(routeToFocus, 800) : undefined

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [router])

  return (
    <button
      type="button"
      data-testid="replay-unwind-button"
      data-route-action="replay-unwind-route-action"
      onClick={() => router.push('/unwind')}
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 120,
        border: '1px solid rgba(226, 248, 255, 0.28)',
        borderRadius: 999,
        padding: '0.7rem 1rem',
        background: 'rgba(2, 9, 22, 0.72)',
        color: 'rgb(236, 250, 255)',
        backdropFilter: 'blur(14px)',
      }}
    >
      Return to Focus
    </button>
  )
}
