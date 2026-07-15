'use client'

import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { assetCssStack, lifeMapAssets } from '@/spatial/assets/uraiAssets'

function safeToken(value: string | null, fallback = '') {
  if (!value) return fallback
  const trimmed = value.trim().slice(0, 120)
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback
}

function LifeMapLoading({ label = 'Opening Life Map…' }: { label?: string }) {
  return (
    <main
      aria-label="Life Map loading"
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        color: '#dffbff',
        background: 'radial-gradient(circle at 50% 45%, rgba(117,231,255,.18), transparent 28%), #020713',
        fontWeight: 900,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </main>
  )
}

const LifeMapRouteBoundary = dynamic(() => import('@/components/lifemap/LifeMapRouteBoundary'), {
  ssr: false,
  loading: () => <LifeMapLoading />,
})

function CanonicalSelectedMemoryControls() {
  const router = useRouter()
  const params = useSearchParams()
  const memoryId = safeToken(params.get('memoryId') || params.get('node') || params.get('nodeId'))
  if (!memoryId) return null

  const manifestId = safeToken(params.get('manifestId'), 'replay-recovery-thread')
  const displayTitle = memoryId === 'quiet-reset' ? 'The Quiet Reset' : memoryId.replace(/[-_]+/g, ' ')
  const identityHref = (route: 'focus' | 'replay') => {
    const next = new URLSearchParams()
    next.set('memoryId', memoryId)
    next.set('manifestId', manifestId)
    next.set('node', memoryId)
    next.set('from', 'life-map-selected-memory')
    return `/${route}?${next.toString()}`
  }

  return (
    <aside
      data-testid="urai-life-map-canonical-memory-controls"
      aria-label={`Selected memory ${displayTitle}`}
      style={{
        position: 'absolute',
        right: 'clamp(14px, 3vw, 34px)',
        bottom: 'clamp(138px, 20vh, 190px)',
        zIndex: 75,
        width: 'min(330px, calc(100vw - 28px))',
        padding: 16,
        border: '1px solid rgba(154, 235, 255, .22)',
        borderRadius: 24,
        color: '#f4fdff',
        background: 'linear-gradient(145deg, rgba(3, 10, 28, .88), rgba(20, 7, 38, .72))',
        boxShadow: '0 26px 90px rgba(0,0,0,.46), 0 0 54px rgba(98,225,255,.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <p style={{ margin: 0, color: '#9cecff', fontSize: 10, fontWeight: 900, letterSpacing: '.2em', textTransform: 'uppercase' }}>Selected sample memory</p>
      <h2 style={{ margin: '6px 0 8px', fontSize: 'clamp(1.3rem, 3vw, 2rem)', lineHeight: 1, letterSpacing: '-.04em' }}>{displayTitle}</h2>
      <p style={{ margin: 0, color: 'rgba(233,247,255,.72)', fontSize: 12, lineHeight: 1.5 }}>The same memory identity stays attached when you enter Focus or Replay.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
        <button type="button" onClick={() => router.push(identityHref('focus'))} style={{ minHeight: 36, padding: '8px 13px', border: 0, borderRadius: 999, color: '#03101f', background: '#bff7ff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Enter Focus</button>
        <button type="button" onClick={() => router.push(identityHref('replay'))} style={{ minHeight: 36, padding: '8px 13px', border: '1px solid rgba(255,255,255,.22)', borderRadius: 999, color: '#fff', background: 'rgba(255,255,255,.07)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Replay</button>
      </div>
    </aside>
  )
}

export default function SpatialLifeMapCanonical() {
  return (
    <section
      data-testid="urai-r3f-canonical-lifemap"
      data-canonical-asset={lifeMapAssets.primary.src}
      aria-label="URAI canonical spatial Life Map"
      style={{ position: 'relative', width: '100%', height: '100svh', minHeight: '100svh', overflow: 'hidden', background: '#01030a' }}
    >
      <Suspense fallback={<LifeMapLoading label="Restoring Life Map…" />}>
        <LifeMapRouteBoundary />
        <CanonicalSelectedMemoryControls />
      </Suspense>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 60,
          pointerEvents: 'none',
          backgroundImage: assetCssStack(lifeMapAssets.primary),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen',
          opacity: 0.012,
        }}
      />
      <style jsx global>{`
        [data-testid="urai-r3f-canonical-lifemap"],
        [data-testid="urai-true-3d-life-map"] {
          width: 100% !important;
          height: 100svh !important;
          min-height: 100svh !important;
        }

        [data-testid="urai-true-3d-life-map"] > div:has(> canvas) {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }

        [data-testid="urai-true-3d-life-map"] canvas {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </section>
  )
}
