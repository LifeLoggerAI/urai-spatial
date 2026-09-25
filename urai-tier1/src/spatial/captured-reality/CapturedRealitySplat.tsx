'use client'

import { Splat } from '@react-three/drei'
import type { CapturedRealityRenderDecision } from './capturedReality'

export type CapturedRealitySplatProps = {
  decision: CapturedRealityRenderDecision
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  chunkSize?: number
  alphaHash?: boolean
}

/**
 * Browser/runtime adapter for governed captured-reality assets.
 *
 * This component deliberately accepts a precomputed render decision rather
 * than raw private source data. Consent, provenance and release gating happen
 * before the renderer is allowed to see a URL.
 *
 * It is not mounted by any launch route in V1. Route integration remains a
 * separate exact-head visual/performance/privacy gate.
 */
export function CapturedRealitySplat({
  decision,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  chunkSize,
  alphaHash = true,
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
      <Splat src={decision.assetUrl} chunkSize={chunkSize} alphaHash={alphaHash} />
    </group>
  )
}

export default CapturedRealitySplat
