'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const LIFE_MAP_STATE_KEY = 'urai:spatial:lifeMapState'
const BRIGHT_NEUTRAL_LIMIT = 0.015
const MIN_LIT_RATIO = 0.04
const REQUIRED_STABLE_SAMPLES = 2

type ReadinessMethod = 'pending' | 'pixel-proof' | 'semantic-recovery' | 'timed-fallback'

type CanvasReadinessSample = {
  brightNeutralRatio: number
  litRatio: number
}

function identityFromParams(params: ReturnType<typeof useSearchParams>) {
  return params.get('node') || params.get('nodeId') || params.get('memoryId') || ''
}

function sampleCanvasReadiness(canvas: HTMLCanvasElement): CanvasReadinessSample | null {
  try {
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGL2RenderingContext | WebGLRenderingContext | null
    if (!gl) return null

    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    if (width < 2 || height < 2) return null

    const stripe = new Uint8Array(width * 4)
    const rowCount = 12
    const horizontalStride = Math.max(1, Math.floor(width / 96))
    let sampled = 0
    let brightNeutral = 0
    let lit = 0

    for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
      const y = Math.min(height - 1, Math.floor((height * rowIndex) / (rowCount + 1)))
      gl.readPixels(0, y, width, 1, gl.RGBA, gl.UNSIGNED_BYTE, stripe)
      for (let x = 0; x < width; x += horizontalStride) {
        const offset = x * 4
        const red = stripe[offset]
        const green = stripe[offset + 1]
        const blue = stripe[offset + 2]
        const maximum = Math.max(red, green, blue)
        const minimum = Math.min(red, green, blue)
        sampled += 1
        if (maximum > 35) lit += 1
        if (red > 190 && green > 190 && blue > 190 && maximum - minimum < 30) brightNeutral += 1
      }
    }

    if (!sampled) return null
    return {
      brightNeutralRatio: brightNeutral / sampled,
      litRatio: lit / sampled,
    }
  } catch {
    return null
  }
}

export default function LifeMapRouteBoundary() {
  const params = useSearchParams()
  const identity = useMemo(() => identityFromParams(params), [params])
  const previousIdentity = useRef(identity)
  const surfaceRootRef = useRef<HTMLDivElement>(null)
  const [revision, setRevision] = useState(0)
  const [surfaceReady, setSurfaceReady] = useState(false)
  const [readinessMethod, setReadinessMethod] = useState<ReadinessMethod>('pending')
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
    setReadinessMethod('pending')
    let frame: number | null = null
    let timer: number | null = null
    let stableSamples = 0
    let failedSamples = 0
    let cancelled = false
    const startedAt = window.performance.now()

    const reveal = (method: Exclude<ReadinessMethod, 'pending'>) => {
      if (cancelled) return
      setReadinessMethod(method)
      setSurfaceReady(true)
    }

    const schedule = (delay = 140) => {
      timer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(checkSurface)
      }, delay)
    }

    const checkSurface = () => {
      if (cancelled) return
      const root = surfaceRootRef.current
      if (!root) {
        schedule()
        return
      }

      const realm = root.querySelector<HTMLElement>('.life-map-independent-realm')
      const webglState = realm?.dataset.webglState
      if (webglState === 'lost' || webglState === 'recovering' || webglState === 'failed') {
        reveal('semantic-recovery')
        return
      }

      const elapsed = window.performance.now() - startedAt
      const canvas = root.querySelector<HTMLCanvasElement>('canvas.life-map-canvas')
      if (!canvas) {
        if (elapsed >= 1800) reveal('timed-fallback')
        else schedule()
        return
      }

      const sample = sampleCanvasReadiness(canvas)
      if (sample) {
        failedSamples = 0
        const cleanFrame = webglState === 'ready'
          && sample.brightNeutralRatio < BRIGHT_NEUTRAL_LIMIT
          && sample.litRatio > MIN_LIT_RATIO
        stableSamples = cleanFrame ? stableSamples + 1 : 0
        if (stableSamples >= REQUIRED_STABLE_SAMPLES && elapsed >= 240) {
          reveal('pixel-proof')
          return
        }
      } else {
        failedSamples += 1
      }

      if (elapsed >= 4500 && webglState === 'ready' && failedSamples >= 4) {
        reveal('timed-fallback')
        return
      }
      schedule()
    }

    frame = window.requestAnimationFrame(checkSurface)
    return () => {
      cancelled = true
      if (frame !== null) window.cancelAnimationFrame(frame)
      if (timer !== null) window.clearTimeout(timer)
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
      ref={surfaceRootRef}
      data-life-map-prepaint-boundary="true"
      data-life-map-surface-ready={surfaceReady ? 'true' : 'false'}
      data-life-map-readiness-method={readinessMethod}
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
