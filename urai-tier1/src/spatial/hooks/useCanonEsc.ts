import { useEffect } from 'react'

export default function useCanonEsc(getPhase: () => string, actions: any) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      const p = getPhase()

      if (p === 'REPLAY') {
        actions.closeReplay()
        return
      }

      if (p === 'FOCUS') {
        actions.openLifeMap()
        return
      }

      if (p === 'LIFEMAP') {
        actions.goHome()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [getPhase, actions])
}
