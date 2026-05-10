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

export function SpatialShell({ mode, sourceBadge, companion, exportPanel, timeline, children }: SpatialShellProps) {
  const isHomeOverview = mode === 'overview'
  const isLifeMapSky = mode === 'sky'

  return (
    <main
      className={`spatial-shell${isHomeOverview ? ' urai-home-shell' : ''}${isLifeMapSky ? ' urai-spatial-stage' : ''}`}
      data-mode={mode}
      data-urai-home-spatial-shell={isHomeOverview ? 'true' : undefined}
      data-urai-life-map-stage={isLifeMapSky ? 'true' : undefined}
    >
      <div className="spatial-shell__starfield lifemap-starfield" aria-hidden />
      <section className="spatial-shell__viewport">{children}</section>
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
