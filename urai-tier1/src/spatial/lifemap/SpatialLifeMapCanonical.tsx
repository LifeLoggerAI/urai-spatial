'use client'

import dynamic from 'next/dynamic'

const AdaptiveLifeMapScene = dynamic(() => import('@/components/lifemap/AdaptiveLifeMapScene'), {
  ssr: false,
  loading: () => (
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
      Opening Life Map…
    </main>
  ),
})

export default function SpatialLifeMapCanonical() {
  return (
    <section data-testid="urai-r3f-canonical-lifemap" aria-label="URAI canonical spatial Life Map">
      <AdaptiveLifeMapScene />
    </section>
  )
}
