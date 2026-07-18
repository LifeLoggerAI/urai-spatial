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
  const [surfaceReady, setSurfaceReady] = useState(false)
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

  useEffect(() => {
    setSurfaceReady(false)
    let secondFrame: number | null = null
    let settleTimer: number | null = null
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        settleTimer = window.setTimeout(() => setSurfaceReady(true), 120)
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
      if (settleTimer !== null) window.clearTimeout(settleTimer)
    }
  }, [identity, revision])

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

  return (
    <div
      data-life-map-prepaint-boundary="true"
      data-life-map-surface-ready={surfaceReady ? 'true' : 'false'}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 44%, rgba(117,231,255,.1), transparent 30%), #020713',
      }}
    >
      <div
        aria-hidden={!surfaceReady}
        style={{
          position: 'absolute',
          inset: 0,
          visibility: surfaceReady ? 'visible' : 'hidden',
          pointerEvents: surfaceReady ? 'auto' : 'none',
        }}
      >
        <AdaptiveLifeMapScene key={`${identity}:${revision}`} />
      </div>
      {!surfaceReady ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1000,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            color: '#dffbff',
            background: 'radial-gradient(circle at 50% 45%, rgba(117,231,255,.16), transparent 28%), #020713',
            fontWeight: 900,
            letterSpacing: '.08em',
            textAlign: 'center',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          Opening constellation…
        </div>
      ) : null}
    </div>
  )
}
