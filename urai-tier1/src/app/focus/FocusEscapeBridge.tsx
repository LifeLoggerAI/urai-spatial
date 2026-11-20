'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function FocusEscapeBridge() {
  const router = useRouter()

  useEffect(() => {
    function setSceneMode(mode: 'focus' | 'life-map') {
      const stage = document.querySelector('[data-testid="urai-scene-stage"]')
      stage?.setAttribute('data-scene-mode', mode)
    }

    function routeToLifeMap() {
      setSceneMode('life-map')
      router.push('/life-map')
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      routeToLifeMap()
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
