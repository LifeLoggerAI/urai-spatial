import { Suspense } from 'react'
import MemoryWorldRouteClient from './MemoryWorldRouteClient'

export const dynamic = 'force-static'

export default function MemoryWorldPage() {
  return (
    <Suspense fallback={<main data-testid="memory-world-route" data-memory-world-state="route-loading" style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'#05070b',color:'#fff'}}><p>Opening Memory World…</p></main>}>
      <MemoryWorldRouteClient />
    </Suspense>
  )
}
