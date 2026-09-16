'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { canEnterMemoryPlace, resolveDemoMemoryStar } from '@/spatial/memory/memoryStarSchema'

type FocusPlaceDoorProps = {
  manifestId?: string | null
}

export function FocusPlaceDoor({ manifestId }: FocusPlaceDoorProps) {
  const searchParams = useSearchParams()
  const resolvedManifestId = manifestId ?? searchParams?.get('manifestId')
  const explicitDemo = searchParams?.get('demo') === '1'
  const resolution = resolveDemoMemoryStar(resolvedManifestId)
  if (!resolution.ok) return null

  const star = resolution.star
  // This component currently resolves bundled demo stars only. Never present its
  // symbolic place door as autobiographical UI unless the route is explicitly
  // disclosed as demo/sample mode. Real lived-world place activation belongs to
  // Ground and source-backed Ground -> Focus context.
  if (star.privacyState === 'demo' && !explicitDemo) return null

  const enterPlaceHref = canEnterMemoryPlace(star) && star.enterPlaceHref
    ? `${star.enterPlaceHref}${star.enterPlaceHref.includes('?') ? '&' : '?'}demo=1`
    : undefined

  if (!enterPlaceHref) return null

  return (
    <aside
      data-testid="urai-focus-place-door"
      data-place-door-authority="explicit-demo-only"
      aria-label="Enter disclosed sample memory place"
      style={{
        position: 'fixed',
        zIndex: 32,
        left: '22px',
        bottom: '82px',
        width: 'min(390px, calc(100vw - 44px))',
        padding: '18px',
        border: '1px solid rgba(103,232,249,0.28)',
        borderRadius: '22px',
        background: 'rgba(2,6,20,0.78)',
        color: '#eaf4ff',
        boxShadow: '0 24px 80px rgba(0,0,0,0.38)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div
        style={{
          fontSize: '0.67rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: '#67e8f9',
          fontWeight: 800,
        }}
      >
        Sample Memory Place
      </div>

      <h2 style={{ margin: '8px 0', fontSize: '1.15rem' }}>
        {star.title} has a disclosed sample place.
      </h2>

      <p style={{ margin: '0 0 14px', color: 'rgba(234,244,255,0.74)', lineHeight: 1.45 }}>
        This is bundled demo data, not reconstructed personal memory. Personal places are entered from authorized Ground context.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <Link
          href={enterPlaceHref}
          style={{
            border: '1px solid rgba(103,232,249,0.45)',
            borderRadius: '999px',
            background: 'rgba(103,232,249,0.18)',
            color: '#eaf4ff',
            padding: '9px 13px',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          Enter Sample Place
        </Link>

        <Link
          href={`${star.replayHref}${star.replayHref.includes('?') ? '&' : '?'}demo=1`}
          style={{
            border: '1px solid rgba(147,197,253,0.28)',
            borderRadius: '999px',
            background: 'rgba(15,23,42,0.62)',
            color: '#eaf4ff',
            padding: '9px 13px',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          Replay Sample
        </Link>
      </div>
    </aside>
  )
}
