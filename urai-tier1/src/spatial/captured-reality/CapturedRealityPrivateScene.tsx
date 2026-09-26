'use client'

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { CapturedRealityRenderDecision } from './capturedReality'
import { CAPTURED_REALITY_QUALITY_PROFILES, capturedRealityDeviceTier } from './capturedRealityRuntime'
import CapturedRealitySplat from './CapturedRealitySplat'
import { CapturedRealityRenderBoundary } from './CapturedRealityRenderBoundary'

export type CapturedRealityPrivateSceneProps = {
  decision: CapturedRealityRenderDecision
  reducedMotion: boolean
  onExit: () => void
  onOpenProvenance?: () => void
  userAgent?: string
}

export function CapturedRealityPrivateScene({
  decision,
  reducedMotion,
  onExit,
  onOpenProvenance,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
}: CapturedRealityPrivateSceneProps) {
  const tier = useMemo(() => capturedRealityDeviceTier(userAgent), [userAgent])
  const quality = CAPTURED_REALITY_QUALITY_PROFILES[tier]

  return (
    <section
      aria-label="Private captured place"
      data-captured-reality-mode={decision.mode}
      data-captured-reality-device-tier={tier}
      data-captured-reality-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ minHeight: '100svh', background: '#05070b', color: '#f7f7f5', display: 'grid', gridTemplateRows: 'auto 1fr' }}
    >
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center', padding: '1rem', zIndex: 2 }}>
        <p aria-live="polite" style={{ margin: 0, flex: '1 1 18rem' }}>{decision.truthLabel}</p>
        <button type="button" onClick={onExit}>Exit captured place</button>
        {onOpenProvenance ? <button type="button" onClick={onOpenProvenance}>View source and provenance</button> : null}
      </header>

      {decision.mode === 'gaussian-splat' ? (
        <div aria-label="Explorable captured place" style={{ minHeight: 0 }}>
          <CapturedRealityRenderBoundary resetKey={decision.assetUrl}>
            <Canvas camera={{ position: [0, 1.6, 4], fov: 62 }} dpr={tier === 'mobile' ? [1, 1.25] : [1, 1.75]}>
              <Suspense fallback={null}>
                <CapturedRealitySplat decision={decision} maxBytes={quality.maxRuntimeBytes} chunkSize={quality.chunkSize} alphaHash={quality.alphaHash} />
              </Suspense>
              <OrbitControls
                enableDamping={!reducedMotion}
                enablePan
                enableZoom
                minDistance={0.25}
                maxDistance={12}
              />
            </Canvas>
          </CapturedRealityRenderBoundary>
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}>
          {decision.mode === 'awaiting-authorized-delivery' ? (
            <p role="status">Opening your private captured place…</p>
          ) : null}
          {decision.mode === 'generic-fallback' || decision.mode === 'mesh-fallback' ? (
            <p role="status">This place is available in a bounded fallback view. UrAi will not invent missing autobiographical geometry.</p>
          ) : null}
          {decision.mode === 'suppressed' ? (
            <p role="status">This private place is unavailable under the current consent or source authority.</p>
          ) : null}
          {decision.mode === 'disabled' ? (
            <p role="status">Captured Reality is currently disabled.</p>
          ) : null}
        </div>
      )}

      <span className="sr-only">
        Captured Reality is optional. You can leave this spatial view at any time and use non-spatial memory surfaces instead.
      </span>
    </section>
  )
}

export default CapturedRealityPrivateScene
