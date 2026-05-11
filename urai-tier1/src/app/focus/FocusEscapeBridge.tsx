'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function FocusEscapeBridge() {
  const router = useRouter()

  useEffect(() => {
    function routeToLifeMap() {
      const stage = document.querySelector('[data-testid="urai-scene-stage"]')
      stage?.setAttribute('data-scene-mode', 'life-map')
      window.sessionStorage.setItem('urai-spatial-escape-stack-return-home', '1')
      router.push('/life-map')
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      routeToLifeMap()
    }

    const directFocusFallback = window.location.pathname === '/focus' && !window.location.search.includes('manifestId=')
    const fallbackTimer = directFocusFallback ? window.setTimeout(routeToLifeMap, 800) : undefined

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
