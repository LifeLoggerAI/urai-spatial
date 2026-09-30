'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CAPTURED_REALITY_QUALITY_PROFILES, capturedRealityDeviceTier } from '@/spatial/captured-reality/capturedRealityRuntime'
import InterpretiveWorldSplat from './InterpretiveWorldSplat'
import { InterpretiveWorldRenderBoundary } from './InterpretiveWorldRenderBoundary'
import type { InterpretiveWorldRenderDecision } from './interpretiveWorld'

export function InterpretiveWorldScene({
  decision,
  reducedMotion,
  onExit,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
}: {
  decision: InterpretiveWorldRenderDecision
  reducedMotion: boolean
  onExit: () => void
  userAgent?: string
}) {
  const tier = useMemo(() => capturedRealityDeviceTier(userAgent), [userAgent])
  const quality = CAPTURED_REALITY_QUALITY_PROFILES[tier]
  const identity = `${decision.mode}\u0000${decision.assetUrl ?? ''}`
  const identityRef = useRef({ value: identity, generation: 0 })
  if (identityRef.current.value !== identity) {
    identityRef.current = { value: identity, generation: identityRef.current.generation + 1 }
  }
  const generation = identityRef.current.generation
  const [readyFor, setReadyFor] = useState<{ generation: number; src: string } | null>(null)
  const rendered = decision.mode === 'interpretive-gaussian-splat'
    && typeof decision.assetUrl === 'string'
    && readyFor?.generation === generation
    && readyFor.src === decision.assetUrl

  return (
    <section
      aria-label="Interpretive generated world"
      data-interpretive-world-mode={decision.mode}
      data-interpretive-world-device-tier={tier}
      data-interpretive-world-autobiographical="false"
      data-interpretive-world-draw-submitted={rendered ? 'true' : 'false'}
      data-interpretive-world-embodied-movement={decision.embodiedMovementAllowed ? 'collision-authorized' : 'bounded-orbit'}
      style={{ minHeight: '100svh', background: '#05070b', color: '#f7f7f5', display: 'grid', gridTemplateRows: 'auto 1fr' }}
    >
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center', padding: '1rem', zIndex: 2 }}>
        <p aria-live="polite" style={{ margin: 0, flex: '1 1 18rem' }}>{decision.truthLabel}</p>
        <button type="button" onClick={onExit}>Exit interpretive world</button>
      </header>

      {decision.mode === 'interpretive-gaussian-splat' ? (
        <div aria-label="Explorable interpretive world" style={{ minHeight: 0 }}>
          <InterpretiveWorldRenderBoundary resetKey={decision.assetUrl}>
            <Canvas camera={{ position: [0, 1.6, 4], fov: 62 }} dpr={tier === 'mobile' ? [1, 1.25] : [1, 1.75]}>
              <Suspense fallback={null}>
                <InterpretiveWorldSplat
                  decision={decision}
                  maxBytes={quality.maxRuntimeBytes}
                  chunkSize={quality.chunkSize}
                  alphaHash={quality.alphaHash}
                  onRenderReady={(src) => setReadyFor({ generation, src })}
                />
              </Suspense>
              <OrbitControls
                enableDamping={!reducedMotion}
                enablePan={false}
                enableZoom
                minDistance={0.25}
                maxDistance={12}
              />
            </Canvas>
          </InterpretiveWorldRenderBoundary>
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <p role="status">
            {decision.mode === 'disabled'
              ? 'Interpretive worlds are currently disabled.'
              : decision.mode === 'awaiting-acceptance'
                ? 'This generated world is waiting for literal visual acceptance.'
                : decision.mode === 'awaiting-reconstruction'
                  ? 'This generated world is waiting for its reconstruction.'
                  : decision.mode === 'awaiting-authorized-delivery'
                    ? 'Opening this interpretive world…'
                    : 'This generated world is unavailable.'}
          </p>
        </div>
      )}

      <span className="sr-only">
        This environment is generated and interpretive. It is not camera-recorded autobiographical history.
      </span>
    </section>
  )
}

export default InterpretiveWorldScene
