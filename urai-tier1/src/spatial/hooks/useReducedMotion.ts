'use client'

import { useEffect, useState } from 'react'

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)

    update()
    query.addEventListener?.('change', update)

    return () => {
      query.removeEventListener?.('change', update)
    }
  }, [])

  return reducedMotion
}
