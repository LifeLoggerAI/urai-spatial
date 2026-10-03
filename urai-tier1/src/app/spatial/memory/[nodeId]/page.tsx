import React, { type CSSProperties } from 'react'
import { DEMO_MEMORY_STAR_NODES, resolveDemoMemoryStar } from '@/spatial/memory/memoryStarSchema'

type SpatialMemoryPageProps = {
  params: Promise<{ nodeId: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return DEMO_MEMORY_STAR_NODES.filter((star) => star.privacyState === 'demo').map((star) => ({
    nodeId: star.id,
  }))
}

const pageStyle: CSSProperties = {
  height: '100svh',
  minHeight: '100svh',
  overflowY: 'auto',
  display: 'grid',
  alignItems: 'safe center',
  justifyItems: 'center',
  padding: 'max(1.25rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
  boxSizing: 'border-box',
  background: 'linear-gradient(180deg,#10234b,#020711)',
}

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '42rem',
  minWidth: 0,
  display: 'grid',
  gap: '.75rem',
  padding: '1.2rem',
  border: '1px solid rgba(178,230,255,.2)',
  borderRadius: '1.2rem',
  background: 'rgba(4,14,28,.7)',
  color: '#e6f9ff',
  overflowWrap: 'anywhere',
}

const linkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
  minWidth: 48,
  padding: '.55rem .75rem',
  border: '1px solid rgba(160,228,255,.24)',
  borderRadius: '1.5rem',
  background: 'rgba(61,139,180,.18)',
  color: '#dff7ff',
  fontWeight: 700,
}

export default async function SpatialMemoryPage({ params }: SpatialMemoryPageProps) {
  const { nodeId } = await params
  const resolution = resolveDemoMemoryStar(nodeId)

  // This exported route is a disclosed sample detail. A non-demo record must
  // never become public merely because its ID exists in the same registry.
  if (!resolution.ok || resolution.star.privacyState !== 'demo') {
    return (
      <main data-testid="urai-spatial-memory-direct-route" data-status={resolution.ok ? 404 : resolution.status} style={pageStyle}>
        <section aria-labelledby="spatial-memory-title" style={cardStyle}>
          <h1 id="spatial-memory-title">Memory unavailable</h1>
          <p>This memory is unavailable, private, or outside the disclosed demo set.</p>
          <a href="/life-map" style={linkStyle}>Return to Life Map</a>
        </section>
      </main>
    )
  }

  const { star } = resolution
  const lifeMapHref = `/life-map?${new URLSearchParams({ demo: '1', node: star.id, from: 'spatial-memory' })}`
  const sampleDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(star.createdAt))

  return (
    <main data-testid="urai-spatial-memory-direct-route" data-status={200} data-memory-id={star.id} data-memory-source={star.sourceType} style={pageStyle}>
      <section aria-labelledby="spatial-memory-title" style={cardStyle}>
        <p style={{ margin: 0, color: '#91dfff' }}>Demonstration memory</p>
        <h1 id="spatial-memory-title" dir="auto" style={{ margin: 0, fontSize: '1.35rem' }}>{star.title}</h1>
        <p dir="auto" style={{ margin: 0 }}>{star.description}</p>
        <p data-demo-disclosure="true" style={{ margin: 0, color: '#c7e6f0' }}>{star.provenanceSummary}</p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '.35rem .8rem', margin: 0 }}>
          <dt>Sample date</dt><dd style={{ margin: 0 }}><time dateTime={star.createdAt}>{sampleDate}</time></dd>
          <dt>Privacy</dt><dd style={{ margin: 0 }}>Demo</dd>
          <dt>Source</dt><dd style={{ margin: 0 }}>{star.sourceId}</dd>
        </dl>
        <nav aria-label="Demonstration memory actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          <a href={star.focusHref} style={linkStyle}>Open Focus</a>
          <a href={star.replayHref} style={linkStyle}>Open Replay</a>
          <a href={lifeMapHref} style={linkStyle}>Return to Life Map</a>
        </nav>
      </section>
    </main>
  )
}
