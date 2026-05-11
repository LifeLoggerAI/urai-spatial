'use client'

import { EffectComposer, Bloom, Vignette, ChromaticAberration, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import { SpatialRenderBudget } from '../visual/aaaMaterials'

export default function CinematicPostProcessing({
  active,
  reducedMotion = false,
  budget,
}: {
  active: boolean
  reducedMotion?: boolean
  budget?: SpatialRenderBudget
}) {
  if (!active) return null

  const qualityTier = budget?.qualityTier ?? (reducedMotion ? 'low' : 'high')
  const bloomEnabled = budget?.bloomEnabled ?? true
  const chromaticAberrationEnabled = budget?.chromaticAberrationEnabled ?? false
  const highQuality = qualityTier === 'high' && !reducedMotion

  return (
    <EffectComposer multisampling={0} enabled={active}>
      {bloomEnabled ? (
        <Bloom
          intensity={qualityTier === 'low' ? 0.32 : qualityTier === 'medium' ? 0.62 : 0.78}
          luminanceThreshold={qualityTier === 'low' ? 0.28 : 0.18}
          luminanceSmoothing={0.64}
          mipmapBlur={qualityTier !== 'low'}
        />
      ) : null}

      {highQuality ? <DepthOfField focusDistance={0.025} focalLength={0.034} bokehScale={1.15} height={360} /> : null}

      {chromaticAberrationEnabled && !reducedMotion ? (
        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new Vector2(0.00045, 0.00035)} />
      ) : null}

      <Vignette eskil={false} offset={0.16} darkness={qualityTier === 'low' ? 0.5 : highQuality ? 0.78 : 0.66} />
    </EffectComposer>
  )
}
