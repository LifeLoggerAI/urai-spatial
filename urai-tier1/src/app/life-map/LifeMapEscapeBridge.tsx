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

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [router])

  return null
}
