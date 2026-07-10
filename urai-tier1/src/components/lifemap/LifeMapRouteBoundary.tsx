'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const LIFE_MAP_STATE_KEY = 'urai:spatial:lifeMapState'

function identityFromParams(params: ReturnType<typeof useSearchParams>) {
  return params.get('node') || params.get('nodeId') || params.get('memoryId') || ''
}

export default function LifeMapRouteBoundary() {
  const params = useSearchParams()
  const identity = useMemo(() => identityFromParams(params), [params])
  const previousIdentity = useRef(identity)
  const [revision, setRevision] = useState(0)
  const returningToOverview = Boolean(previousIdentity.current && !identity)

  useEffect(() => {
    if (previousIdentity.current && !identity) {
      try {
        window.localStorage.removeItem(LIFE_MAP_STATE_KEY)
      } catch {
        // Browser history still returns to overview when storage is unavailable.
      }
      setRevision((current) => current + 1)
    }
    previousIdentity.current = identity
  }, [identity])

  if (returningToOverview) {
    return (
      <main
        aria-label="Restoring Life Map overview"
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
        Restoring overview…
      </main>
    )
  }

  return <AdaptiveLifeMapScene key={`${identity}:${revision}`} />
}
