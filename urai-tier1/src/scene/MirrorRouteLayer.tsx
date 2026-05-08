'use client'

import { useEffect } from 'react'
import MirrorExperience from './MirrorExperience'

export default function MirrorRouteLayer({ onLifeMap, onHome }: { onLifeMap: () => void; onHome: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onHome()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onHome])

  return <MirrorExperience onLifeMap={onLifeMap} onHome={onHome} />
}
