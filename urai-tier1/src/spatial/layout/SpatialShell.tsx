import type { ReactNode } from 'react'

type SourceBadge = 'demo' | 'local' | 'firestore' | 'error'

type SpatialShellProps = {
  mode: 'overview' | 'sky' | 'replay' | 'detail' | 'export' | 'fallback'
  sourceBadge?: SourceBadge
  companion?: ReactNode
  exportPanel?: ReactNode
  timeline?: ReactNode
  children: ReactNode
}

const sourceBadgeCopy: Record<SourceBadge, string> = {
  demo: 'Public-safe preview · sample data',
  local: 'Local fallback · not synced',
  firestore: 'Connected data · access controlled',
  error: 'Fallback mode · provider unavailable',
}

const modeCopy: Record<SpatialShellProps['mode'], { title: string; summary: string }> = {
  overview: {
    title: 'Moonlit Spatial Home',
    summary: 'A staged public-demo world with sample memory previews, sealed provider gates, and no live sensing claims.',
  },
  sky: {
    title: 'Moonlit Life Map',
    summary: 'A constellation preview using public-safe sample moments until owner-scoped data is verified.',
  },
  replay: {
    title: 'Replay Chamber',
    summary: 'A guided symbolic replay preview with calm exits and no production data capture.',
  },
  detail: {
    title: 'Focus Chamber',
    summary: 'A sealed detail surface for sample reflections, readiness copy, and provider-gated actions.',
  },
  export: {
    title: 'Export Gate',
    summary: 'A locked export surface that requires verified ownership, provider configuration, and evidence before live use.',
  },
  fallback: {
    title: 'Fallback Shell',
    summary: 'A safe local Spatial shell when provider checks are unavailable or interrupted.',
  },
}

const sealedCapabilities = [
  'XR sealed',
  'Provider gated',
  'Consent required',
  'Asset pipeline staged',
] as const

function SacredBackground() {
  return (
    <div className="spatial-shell__sacred-background" aria-hidden="true">
      <div className="spatial-shell__moon" />
      <div className="spatial-shell__horizon" />
      <div className="spatial-shell__mist spatial-shell__mist--one" />
      <div className="spatial-shell__mist spatial-shell__mist--two" />
      <div className="spatial-shell__platform" />
      <div className="spatial-shell__platform-reflection" />
    </div>
  )
}

function ReadinessPanel({ sourceBadge }: { sourceBadge?: SourceBadge }) {
  return (
    <aside className="spatial-shell__readiness" aria-label="URAI Spatial readiness gate">
      <span className="spatial-shell__readiness-eyebrow">Readiness gate</span>
      <strong>{sourceBadge ? sourceBadgeCopy[sourceBadge] : 'Fallback demo staged'}</strong>
      <p>Live providers stay sealed until consent, route checks, deploy evidence, and smoke tests pass.</p>
    </aside>
  )
}

function SealedFeatureState() {
  return (
    <aside className="spatial-shell__sealed" aria-label="Sealed Spatial capabilities">
      {sealedCapabilities.map((capability) => (
        <span key={capability}>{capability}</span>
      ))}
    </aside>
  )
}

function ReducedMotionSummary({ mode }: { mode: SpatialShellProps['mode'] }) {
  const copy = modeCopy[mode]

  return (
    <section className="spatial-shell__reduced-summary" aria-label="Accessible Spatial scene summary">
      <span>{copy.title}</span>
      <p>{copy.summary}</p>
    </section>
  )
}

export function SpatialShell({ mode, sourceBadge, companion, exportPanel, timeline, children }: SpatialShellProps) {
  const isHomeOverview = mode === 'overview'
  const isLifeMapSky = mode === 'sky'

  return (
    <main
      className={`spatial-shell${isHomeOverview ? ' urai-home-shell' : ''}${isLifeMapSky ? ' urai-spatial-stage' : ''}`}
      data-mode={mode}
      data-urai-home-spatial-shell={isHomeOverview ? 'true' : undefined}
      data-urai-life-map-stage={isLifeMapSky ? 'true' : undefined}
      data-urai-spatial-release="fallback-demo"
      data-urai-provider-claims="sealed"
    >
      <SacredBackground />
      <div className="spatial-shell__starfield lifemap-starfield" aria-hidden="true" />
      <section className="spatial-shell__viewport" aria-label={modeCopy[mode].title}>{children}</section>
      <ReducedMotionSummary mode={mode} />
      <ReadinessPanel sourceBadge={sourceBadge} />
      <SealedFeatureState />
      {companion ? <aside className="spatial-shell__companion">{companion}</aside> : null}
      {exportPanel ? <aside className="spatial-shell__export">{exportPanel}</aside> : null}
      {timeline ? <footer className="spatial-shell__timeline">{timeline}</footer> : null}
      {sourceBadge ? (
        <div className="spatial-shell__badge" aria-label={`URAI Spatial data source: ${sourceBadgeCopy[sourceBadge]}`}>
          {sourceBadgeCopy[sourceBadge]}
        </div>
      ) : null}
    </main>
  )
}
