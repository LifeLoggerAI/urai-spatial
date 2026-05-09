'use client'

export type AscentPhase =
  | 'idle'
  | 'homeExiting'
  | 'ascentOpening'
  | 'ascentRevealing'
  | 'waitingForLifeMap'
  | 'lifemapReady'
  | 'error'

export type LifeMapDataStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

type AscentOverlayProps = {
  phase: AscentPhase
  dataStatus: LifeMapDataStatus
  reducedMotion: boolean
}

const phaseCopy: Record<AscentPhase, { label: string; status: string }> = {
  idle: { label: 'Life Map ready', status: 'Waiting for entry' },
  homeExiting: { label: 'Opening your Life Map.', status: 'Leaving home field' },
  ascentOpening: { label: 'Opening your Life Map.', status: 'Gathering remembered moments' },
  ascentRevealing: { label: 'Your Life Map is forming.', status: 'Memories are becoming constellations' },
  waitingForLifeMap: { label: 'Your Life Map is forming.', status: 'Waiting for the constellation to finish loading' },
  lifemapReady: { label: 'Life Map ready.', status: 'Constellation settled' },
  error: { label: 'Life Map could not open.', status: 'The constellation is unavailable' },
}

export function AscentOverlay({ phase, dataStatus, reducedMotion }: AscentOverlayProps) {
  if (phase === 'idle' || phase === 'lifemapReady') return null

  const copy = phaseCopy[phase]
  const status = phase === 'error' || dataStatus === 'error' ? phaseCopy.error.status : copy.status

  return (
    <section
      aria-label="Life Map opening transition"
      aria-live="polite"
      role="status"
      data-testid="urai-ascent-cover"
      data-ascent-phase={phase}
      data-lifemap-data-status={dataStatus}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      className="ascent-overlay"
    >
      <div className="ascent-overlay__ring ascent-overlay__ring--outer" aria-hidden="true" />
      <div className="ascent-overlay__ring ascent-overlay__ring--middle" aria-hidden="true" />
      <div className="ascent-overlay__ring ascent-overlay__ring--inner" aria-hidden="true" />
      <div className="ascent-overlay__orb" aria-hidden="true" />
      <div className="ascent-overlay__copy">
        <p>Opening Life Map</p>
        <h1>{copy.label}</h1>
        <span>Gathering remembered moments into constellation.</span>
      </div>
      <div className="ascent-overlay__status">
        <span aria-hidden="true" />
        <strong>{status}</strong>
      </div>
    </section>
  )
}

export default AscentOverlay
