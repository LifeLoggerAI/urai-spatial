'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { assetCssStack, lifeMapAssets } from '@/spatial/assets/uraiAssets'
import LifeMapDeepLinkControls from './LifeMapDeepLinkControls'

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

export default function SpatialLifeMapCanonical() {
  return (
    <section
      data-testid="urai-r3f-canonical-lifemap"
      data-canonical-asset={lifeMapAssets.primary.src}
      data-life-map-orb-owner="none"
      aria-label="URAI canonical spatial Life Map"
      style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', background: '#01030a' }}
    >
      <Suspense fallback={<LifeMapLoading label="Restoring Life Map…" />}>
        <LifeMapRouteBoundary />
        <LifeMapDeepLinkControls />
      </Suspense>

      <div
        data-testid="urai-lifemap-orb-free-center"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 'min(31rem, 72vw)',
          aspectRatio: '1',
          zIndex: 12,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(1,3,10,.99) 0 18%, rgba(1,3,10,.94) 30%, rgba(1,3,10,.62) 48%, rgba(1,3,10,.14) 66%, transparent 76%)',
        }}
      />

      <div
        data-testid="urai-lifemap-legacy-companion-mask"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 54,
          width: 'min(590px, calc(100vw - 20px))',
          height: 'min(230px, 28svh)',
          zIndex: 70,
          pointerEvents: 'none',
          transform: 'translateX(-50%)',
          borderRadius: 36,
          background: 'linear-gradient(180deg, rgba(1,3,10,0), rgba(1,3,10,.92) 38%, #01030a 100%)',
        }}
      />

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
          opacity: 0.08,
        }}
      />
    </section>
  )
}
