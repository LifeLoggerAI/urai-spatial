import { Suspense } from 'react'
import InterpretiveWorldRouteClient from './InterpretiveWorldRouteClient'

export const dynamic = 'force-static'

export default function InterpretiveWorldRoutePage() {
  return (
    <Suspense fallback={
      <main
        data-testid="interpretive-world-route"
        data-state="route-loading"
        style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#05070b', color: '#f7f7f5' }}
      >
        <p>Opening interpretive world…</p>
      </main>
    }>
      <InterpretiveWorldRouteClient />
    </Suspense>
  )
}
