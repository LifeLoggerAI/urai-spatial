import type { ReactNode } from 'react'

type SpatialShellProps = {
  mode: 'overview' | 'sky' | 'replay' | 'detail' | 'export' | 'fallback'
  sourceBadge?: 'demo' | 'local' | 'firestore' | 'error'
  companion?: ReactNode
  exportPanel?: ReactNode
  timeline?: ReactNode
  children: ReactNode
}

export function SpatialShell({ mode, sourceBadge, companion, exportPanel, timeline, children }: SpatialShellProps) {
  return (
    <main className="spatial-shell" data-mode={mode}>
      <div className="spatial-shell__starfield" aria-hidden />
      <section className="spatial-shell__viewport">{children}</section>
      {companion ? <aside className="spatial-shell__companion">{companion}</aside> : null}
      {exportPanel ? <aside className="spatial-shell__export">{exportPanel}</aside> : null}
      {timeline ? <footer className="spatial-shell__timeline">{timeline}</footer> : null}
      {process.env.NODE_ENV !== 'production' && sourceBadge ? (
        <div className="spatial-shell__badge">source: {sourceBadge}</div>
      ) : null}
    </main>
  )
}
