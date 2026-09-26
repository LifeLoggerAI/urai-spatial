import { Suspense } from 'react'
import CapturedRealityRouteClient from './CapturedRealityRouteClient'

export const dynamic = 'force-static'

export default function CapturedRealityRoutePage() {
  return (
    <Suspense fallback={
      <main
        data-testid="captured-reality-private-route"
        data-state="route-loading"
        style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#05070b', color: '#f7f7f5' }}
      >
        <p>Opening private captured place…</p>
      </main>
    }>
      <CapturedRealityRouteClient />
    </Suspense>
  )
}
