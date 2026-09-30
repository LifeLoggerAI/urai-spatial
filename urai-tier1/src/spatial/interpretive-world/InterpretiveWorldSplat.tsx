'use client'

import { CAPTURED_REALITY_QUALITY_PROFILES } from '@/spatial/captured-reality/capturedRealityRuntime'
import { OwnedCapturedRealitySplat } from '@/spatial/captured-reality/OwnedCapturedRealitySplat'
import type { InterpretiveWorldRenderDecision } from './interpretiveWorld'

export type InterpretiveWorldSplatProps = {
  decision: InterpretiveWorldRenderDecision
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  maxBytes?: number
  chunkSize?: number
  alphaHash?: boolean
  onRenderReady?: (src: string) => void
}

export function InterpretiveWorldSplat({
  decision,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  maxBytes = CAPTURED_REALITY_QUALITY_PROFILES.mobile.maxRuntimeBytes,
  chunkSize,
  alphaHash = true,
  onRenderReady,
}: InterpretiveWorldSplatProps) {
  if (decision.mode !== 'interpretive-gaussian-splat' || !decision.assetUrl) return null

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        uraiInterpretiveWorld: true,
        truthLabel: decision.truthLabel,
        autobiographical: false,
        allowedSourceIds: [],
      }}
    >
      <OwnedCapturedRealitySplat
        src={decision.assetUrl}
        maxBytes={maxBytes}
        chunkSize={chunkSize}
        alphaHash={alphaHash}
        loadingLabel="Loading interpretive world"
        failureMessage="Interpretive world rendering stopped."
        onRenderReady={onRenderReady}
      />
    </group>
  )
}

export default InterpretiveWorldSplat
