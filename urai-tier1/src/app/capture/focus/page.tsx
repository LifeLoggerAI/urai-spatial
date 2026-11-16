'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import InstitutionalPublicSurface from '../../InstitutionalPublicSurface'

export default function CinematicFocusCaptureRoute() {
  const router = useRouter()

  useEffect(() => {
    // Keep selected-memory, source, and explicit demo context from this entry URL.
    router.replace(`/focus${window.location.search}${window.location.hash}`)
  }, [router])

  return (
    <InstitutionalPublicSurface
      eyebrow="UrAi · Focus"
      title="Opening your memory star."
      lede="Focus is the place to explore a selected memory and enter Replay."
      links={[{ href: '/focus', label: 'Open Focus', primary: true }, { href: '/life-map', label: 'Return to Life Map' }]}
    />
  )
}
