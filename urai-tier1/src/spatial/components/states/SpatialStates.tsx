import type { ReactNode } from 'react'

export function SpatialModeFrame({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="spatial-mode-frame">
      <header>
        <p>{subtitle ?? 'URAI Spatial Tier 1'}</p>
        <h1>{title}</h1>
      </header>
      {children ? <div className="spatial-mode-frame__body">{children}</div> : null}
      {actions ? <div className="spatial-mode-frame__actions">{actions}</div> : null}
    </section>
  )
}

export function SpatialLoadingState() {
  return <SpatialModeFrame title="Loading spatial scene" subtitle="Cinematic runtime" />
}

export function SpatialErrorState({ message }: { message: string }) {
  return <SpatialModeFrame title="Spatial scene degraded" subtitle="Service state" >{message}</SpatialModeFrame>
}

export function SpatialEmptyState({ title = 'No memories available yet' }: { title?: string }) {
  return <SpatialModeFrame title={title} subtitle="Demo-safe fallback" />
}
