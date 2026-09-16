'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type GroundEnvironment = 'temperate' | 'woodland' | 'urban' | 'arid' | 'coastal'

const descriptions: Record<GroundEnvironment, string> = {
  temperate: 'Temperate lived terrain with soil, low vegetation, rock, open air, and a natural route through the middle distance.',
  woodland: 'Woodland lived terrain with denser vegetation, roots, rock, filtered sky, and shorter sight lines.',
  urban: 'Privacy-safe generic urban lived terrain with hard surfaces, built edges, changing occlusion, and distant architecture.',
  arid: 'Arid lived terrain with exposed geology, sparse plants, dry air, rock formations, and long horizon visibility.',
  coastal: 'Coastal lived terrain with shoreline geology, open water, humid air, and a broad horizon.',
}

function resolveEnvironment(value: string | null): GroundEnvironment {
  if (value === 'woodland' || value === 'urban' || value === 'arid' || value === 'coastal') return value
  return 'temperate'
}

export default function GroundSemanticGuide() {
  const searchParams = useSearchParams()
  const environment = useMemo(() => resolveEnvironment(searchParams.get('environment')), [searchParams])
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const onSurfaceCommit = () => setAnnouncement('Moving toward the selected terrain while staying at human eye height.')
    const onReturn = () => setAnnouncement('Returning toward Home through the Ground transition.')
    window.addEventListener('urai:ground-surface-commit', onSurfaceCommit)
    window.addEventListener('urai:world-return', onReturn)
    return () => {
      window.removeEventListener('urai:ground-surface-commit', onSurfaceCommit)
      window.removeEventListener('urai:world-return', onReturn)
    }
  }, [])

  return (
    <section className="sr-only" aria-label="Ground spatial description" data-ground-semantic-guide="relative-language-no-raw-coordinates">
      <h2>Ground spatial description</h2>
      <p>{descriptions[environment]}</p>
      <p>You are exploring in first person at human eye height. No visible body, hands, reticle, or artificial head bob is required.</p>
      <p>Move with the available directional controls or select visible terrain. The environment, not a waypoint beam or compass, provides orientation.</p>
      <p>Home is always available through the Return Home control or the standard back or Escape path. The arrival area remains part of the physical terrain rather than becoming a portal.</p>
      <p>Private place and memory content remains absent unless the required consent and authorized data are available.</p>
      <p>UrAi remains available through semantic conversation and audio controls without a follower Orb in the Ground world.</p>
      <div role="status" aria-live="polite" aria-atomic="true" data-ground-relative-navigation-status>{announcement}</div>
    </section>
  )
}
