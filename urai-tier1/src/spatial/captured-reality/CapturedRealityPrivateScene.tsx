'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { CapturedRealityRenderDecision } from './capturedReality'
import { CAPTURED_REALITY_QUALITY_PROFILES, capturedRealityDeviceTier } from './capturedRealityRuntime'
import CapturedRealitySplat from './CapturedRealitySplat'
import CapturedRealityHybridMesh from './CapturedRealityHybridMesh'
import type { CapturedRealityHybridMeshPayload } from './capturedRealityHybridGeometry'
import { CapturedRealityRenderBoundary } from './CapturedRealityRenderBoundary'
import type { CapturedRealityStreamAuthority } from './capturedRealityDelivery'

export type CapturedRealityPrivateSceneProps = {
  decision: CapturedRealityRenderDecision
  reducedMotion: boolean
  onExit: () => void
  onOpenProvenance?: () => void
  userAgent?: string
  authority?: CapturedRealityStreamAuthority
  /** Optional independently authorized and immutable mesh bytes. No client-side URL fetching. */
  hybridMesh?: CapturedRealityHybridMeshPayload | null
  activeSplatSha256?: string
  hybridAccessMode?: 'proof' | 'runtime'
}

export function CapturedRealityPrivateScene({
  decision,
  reducedMotion,
  onExit,
  onOpenProvenance,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  authority,
  hybridMesh = null,
  activeSplatSha256,
  hybridAccessMode = 'proof',
}: CapturedRealityPrivateSceneProps) {
  const tier = useMemo(() => capturedRealityDeviceTier(userAgent), [userAgent])
  const quality = CAPTURED_REALITY_QUALITY_PROFILES[tier]
  const decisionIdentity = `${decision.mode}\u0000${decision.assetUrl ?? ''}`
  const identityRef = useRef({ value: decisionIdentity, generation: 0 })
  if (identityRef.current.value !== decisionIdentity) {
    identityRef.current = { value: decisionIdentity, generation: identityRef.current.generation + 1 }
  }
  const generation = identityRef.current.generation
  // The same SHA-256 may be re-fetched after consent, token or storage-generation
  // changes. Never reuse an earlier GLB draw receipt for a newly mounted payload.
  const meshIdentityRef = useRef({ payload: hybridMesh, generation: 0 })
  if (meshIdentityRef.current.payload !== hybridMesh) {
    meshIdentityRef.current = {
      payload: hybridMesh,
      generation: meshIdentityRef.current.generation + 1,
    }
  }
  const meshGeneration = meshIdentityRef.current.generation
  const [renderReadyFor, setRenderReadyFor] = useState<{ generation: number; src: string } | null>(null)
  const [meshDrawReadyFor, setMeshDrawReadyFor] = useState<{ generation: number; meshGeneration: number; sha256: string } | null>(null)
  const hybridDrawReady = Boolean(hybridMesh && activeSplatSha256 && renderReadyFor?.generation === generation
    && meshDrawReadyFor?.generation === generation
    && meshDrawReadyFor.meshGeneration === meshGeneration
    && meshDrawReadyFor.sha256 === hybridMesh.sha256)
  const renderReady = decision.mode === 'gaussian-splat'
    && typeof decision.assetUrl === 'string'
    && renderReadyFor?.generation === generation
    && renderReadyFor.src === decision.assetUrl

  return (
    <section
      aria-label="Private captured place"
      data-captured-reality-mode={decision.mode}
      data-captured-reality-device-tier={tier}
      data-captured-reality-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-captured-reality-draw-submitted={renderReady ? 'true' : 'false'}
      data-captured-reality-hybrid-draw-submitted={renderReady && hybridDrawReady ? 'true' : 'false'}
      data-captured-reality-render-state={
        decision.mode === 'gaussian-splat'
          ? (renderReady ? 'GAUSSIAN_RENDERED' : 'LOADING_OR_BLANK')
          : decision.mode === 'generic-fallback' || decision.mode === 'mesh-fallback'
            ? 'FALLBACK_RENDERED'
            : decision.mode.toUpperCase()
      }
      style={{ minHeight: '100svh', background: '#05070b', color: '#f7f7f5', display: 'grid', gridTemplateRows: 'auto 1fr' }}
    >
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center', padding: '1rem', zIndex: 2 }}>
        <p aria-live="polite" style={{ margin: 0, flex: '1 1 18rem' }}>{decision.truthLabel}</p>
        <button type="button" onClick={onExit} style={{ minWidth: 48, minHeight: 48 }}>Exit captured place</button>
        {onOpenProvenance ? <button type="button" onClick={onOpenProvenance} style={{ minWidth: 48, minHeight: 48 }}>View source and provenance</button> : null}
      </header>

      {decision.mode === 'gaussian-splat' ? (
        <div aria-label="Explorable captured place" style={{ minHeight: 0 }}>
          <CapturedRealityRenderBoundary resetKey={decision.assetUrl}>
            <Canvas camera={{ position: [0, 1.6, 4], fov: 62 }} dpr={tier === 'mobile' ? [1, 1.25] : [1, 1.75]}>
              <Suspense fallback={null}>
                {hybridMesh && activeSplatSha256 ? (
                  <CapturedRealityHybridMesh mesh={hybridMesh} activeSplatSha256={activeSplatSha256} mode={hybridAccessMode}
                    onRenderReady={(sha256) => setMeshDrawReadyFor({ generation, meshGeneration, sha256 })} />
                ) : null}
                <CapturedRealitySplat
                  decision={decision}
                  maxBytes={quality.maxRuntimeBytes}
                  chunkSize={quality.chunkSize}
                  alphaHash={quality.alphaHash}
                  onRenderReady={(src) => setRenderReadyFor({ generation, src })}
                  authority={authority}
                />
              </Suspense>
              <OrbitControls
                enableDamping={!reducedMotion}
                // The source has no authoritative metric scale or walkable bounds.
                // Orbit and bounded zoom are safe; translation is not.
                enablePan={false}
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

      <span
        className="sr-only"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Captured Reality is optional. You can leave this spatial view at any time and use non-spatial memory surfaces instead.
      </span>
    </section>
  )
}

export default CapturedRealityPrivateScene
