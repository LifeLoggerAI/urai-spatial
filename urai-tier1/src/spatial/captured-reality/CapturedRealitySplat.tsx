'use client'

import { OwnedCapturedRealitySplat } from './OwnedCapturedRealitySplat'
import { CAPTURED_REALITY_QUALITY_PROFILES } from './capturedRealityRuntime'
import type { CapturedRealityRenderDecision } from './capturedReality'
import type { CapturedRealityStreamAuthority } from './capturedRealityDelivery'

export type CapturedRealitySplatProps = {
  decision: CapturedRealityRenderDecision
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  maxBytes?: number
  chunkSize?: number
  alphaHash?: boolean
  onRenderReady?: (src: string) => void
  authority?: CapturedRealityStreamAuthority
}

/**
 * Browser/runtime adapter for governed captured-reality assets.
 *
 * This component deliberately accepts a precomputed render decision rather
 * than raw private source data. Consent, provenance and release gating happen
 * before the renderer is allowed to see a URL.
 *
 * The private captured-reality route mounts this adapter only after owner,
 * consent, release and authenticated-delivery gates succeed. Visual acceptance and
 * device certification remain separate exact-head gates.
 */
export function CapturedRealitySplat({
  decision,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  maxBytes = CAPTURED_REALITY_QUALITY_PROFILES.mobile.maxRuntimeBytes,
  chunkSize,
  alphaHash = true,
  onRenderReady,
  authority,
}: CapturedRealitySplatProps) {
  if (decision.mode !== 'gaussian-splat' || !decision.assetUrl) return null

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        uraiCapturedReality: true,
        truthLabel: decision.truthLabel,
        autobiographical: decision.autobiographical,
      }}
    >
      <OwnedCapturedRealitySplat src={decision.assetUrl} maxBytes={maxBytes} chunkSize={chunkSize} alphaHash={alphaHash} onRenderReady={onRenderReady} authority={authority} />
    </group>
  )
}

export default CapturedRealitySplat
