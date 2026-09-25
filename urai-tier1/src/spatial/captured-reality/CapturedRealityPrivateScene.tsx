'use client'

import { useMemo } from 'react'
import type { CapturedRealityRenderDecision } from './capturedReality'
import { CAPTURED_REALITY_QUALITY_PROFILES, capturedRealityDeviceTier } from './capturedRealityRuntime'
import CapturedRealitySplat from './CapturedRealitySplat'

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
    >
      <header>
        <p aria-live="polite">{decision.truthLabel}</p>
        <button type="button" onClick={onExit}>Exit captured place</button>
        {onOpenProvenance ? <button type="button" onClick={onOpenProvenance}>View source and provenance</button> : null}
      </header>

      {decision.mode === 'gaussian-splat' ? (
        <CapturedRealitySplat decision={decision} chunkSize={quality.chunkSize} alphaHash={quality.alphaHash} />
      ) : null}

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

      <span className="sr-only">
        Captured Reality is optional. You can leave this spatial view at any time and use non-spatial memory surfaces instead.
      </span>
    </section>
  )
}

export default CapturedRealityPrivateScene
