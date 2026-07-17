'use client'

import { useCallback } from 'react'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type HomeSanctuaryFallbackProps = {
  onOrbOpen: () => void
  reason: 'no-webgl' | 'context-lost' | 'reduced-graphics'
}

export default function HomeSanctuaryFallback({ onOrbOpen, reason }: HomeSanctuaryFallbackProps) {
  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => {
    const ascending = destination === 'life-map'
    requestUraiWorldTravel({
      destination,
      href: ascending ? '/life-map?from=home-sky' : '/ground?from=home',
      entryPortal: ascending ? 'home-sky' : 'home-ground',
      cameraCheckpoint: ascending ? 'home-sky-ascent' : 'home-ground-descent',
    })
  }, [])

  return (
    <section
      className="urai-home-fallback"
      data-home-spatial-renderer="layered-2d"
      data-home-fallback-reason={reason}
      aria-label="URAI personal sanctuary in reduced graphics mode"
    >
      <button
        type="button"
        className="urai-home-fallback__sky"
        aria-label="Ascend to Life Map"
        onClick={() => travel('life-map')}
      >
        <span className="urai-home-fallback__aurora urai-home-fallback__aurora--one" aria-hidden="true" />
        <span className="urai-home-fallback__aurora urai-home-fallback__aurora--two" aria-hidden="true" />
        <span className="urai-home-fallback__stars" aria-hidden="true" />
      </button>

      <div className="urai-home-fallback__horizon" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
      </div>

      <div className="urai-home-fallback__presences" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
      </div>

      <button
        type="button"
        className="urai-home-fallback__ground"
        aria-label="Descend to Ground"
        onClick={() => travel('infrastructure-hub')}
      >
        <span className="urai-home-fallback__floor" aria-hidden="true" />
        <span className="urai-home-fallback__circuit urai-home-fallback__circuit--one" aria-hidden="true" />
        <span className="urai-home-fallback__circuit urai-home-fallback__circuit--two" aria-hidden="true" />
        <span className="urai-home-fallback__pedestal" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="urai-home-fallback__avatar"
        aria-label="Open embodied self"
        onClick={() => window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-fallback' } }))}
      >
        <span className="urai-home-fallback__avatar-aura" aria-hidden="true" />
        <span className="urai-home-fallback__avatar-head" aria-hidden="true" />
        <span className="urai-home-fallback__avatar-body" aria-hidden="true" />
      </button>

      <button type="button" className="urai-home-fallback__orb" aria-label="Open Orb companion" onClick={onOrbOpen}>
        <span aria-hidden="true" />
      </button>

      <p className="sr-only" aria-live="polite">
        Reduced graphics sanctuary active. Sky, Ground, embodied self, and Orb remain available.
      </p>
    </section>
  )
}
