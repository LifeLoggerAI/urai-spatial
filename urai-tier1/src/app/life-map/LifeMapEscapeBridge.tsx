'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function LifeMapEscapeBridge() {
  const router = useRouter()

  useEffect(() => {
    function routeToHome() {
      const stage = document.querySelector('[data-testid="urai-scene-stage"]')
      stage?.setAttribute('data-scene-mode', 'home')
      router.push('/')
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      routeToHome()
    }

    const shouldReturnHome = window.sessionStorage.getItem('urai-spatial-escape-stack-return-home') === '1'
    const fallbackTimer = shouldReturnHome
      ? window.setTimeout(() => {
          window.sessionStorage.removeItem('urai-spatial-escape-stack-return-home')
          routeToHome()
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
