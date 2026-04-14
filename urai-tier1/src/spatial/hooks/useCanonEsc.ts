'use client'

import { useEffect } from 'react'

type CanonPhase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

type EscActions = {
  closeReplay?: () => void
  openLifeMap?: () => void
  goHome?: () => void
}

export default function useCanonEsc(phase: CanonPhase | string, actions: EscActions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      const p = String(phase || '').toUpperCase()

      if (p === 'REPLAY') {
        actions.closeReplay?.()
        return
      }

      if (p === 'FOCUS') {
        actions.openLifeMap?.()
        return
      }

      if (p === 'LIFEMAP' || p === 'ASCENT') {
        actions.goHome?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, actions])
}
