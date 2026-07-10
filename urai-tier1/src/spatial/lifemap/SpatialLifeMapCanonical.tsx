'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

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
    <section data-testid="urai-r3f-canonical-lifemap" aria-label="URAI canonical spatial Life Map">
      <Suspense fallback={<LifeMapLoading label="Restoring Life Map…" />}>
        <LifeMapRouteBoundary />
      </Suspense>
    </section>
  )
}
