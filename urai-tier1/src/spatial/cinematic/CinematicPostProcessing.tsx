'use client'

import { EffectComposer, Bloom, Vignette, ChromaticAberration, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import { useMemo, type ReactElement } from 'react'
import { SpatialRenderBudget, resolveSpatialRenderBudget } from '../visual/aaaMaterials'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useSharedHomeSceneVisualBudget } from '../../scene/homeSceneVisualBudgetContext'

export default function CinematicPostProcessing({
  active,
  reducedMotion,
  budget,
}: {
  active: boolean
  reducedMotion?: boolean
  budget?: SpatialRenderBudget
}) {
  const sharedVisualBudget = useSharedHomeSceneVisualBudget()
  const prefersReducedMotion = useReducedMotion()
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion
  const resolvedBudget = useMemo(
    () => budget ?? sharedVisualBudget?.budget ?? resolveSpatialRenderBudget({ reducedMotion: effectiveReducedMotion, qualityTier: effectiveReducedMotion ? 'low' : 'high' }),
    [budget, sharedVisualBudget, effectiveReducedMotion],
  )

  const chromaticOffset = useMemo(() => new Vector2(0.00045, 0.00035), [])

  if (!active) return null

  const qualityTier = resolvedBudget.qualityTier
  const bloomEnabled = resolvedBudget.bloomEnabled
  const chromaticAberrationEnabled = resolvedBudget.chromaticAberrationEnabled
  const highQuality = qualityTier === 'high' && !effectiveReducedMotion
  const effects: ReactElement[] = []

  if (bloomEnabled) {
    effects.push(
      <Bloom
        key="bloom"
        intensity={qualityTier === 'low' ? 0.32 : qualityTier === 'medium' ? 0.62 : 0.78}
        luminanceThreshold={qualityTier === 'low' ? 0.28 : 0.18}
        luminanceSmoothing={0.64}
        mipmapBlur={qualityTier !== 'low'}
      />,
    )
  }

  if (highQuality) {
    effects.push(<DepthOfField key="depth-of-field" focusDistance={0.025} focalLength={0.034} bokehScale={1.15} height={360} />)
  }

  if (chromaticAberrationEnabled && !effectiveReducedMotion) {
    effects.push(<ChromaticAberration key="chromatic-aberration" blendFunction={BlendFunction.NORMAL} offset={chromaticOffset} />)
  }

  effects.push(<Vignette key="vignette" eskil={false} offset={0.16} darkness={qualityTier === 'low' ? 0.5 : highQuality ? 0.78 : 0.66} />)

  return (
    <group
      name="urai-cinematic-postprocessing-budget"
      userData={{
        testId: 'urai-cinematic-postprocessing-budget',
        renderBudgetQualityTier: qualityTier,
        renderBudgetBloomEnabled: bloomEnabled,
        renderBudgetChromaticAberrationEnabled: chromaticAberrationEnabled,
      }}
    >
      {/* Contract anchors: data-testid="urai-cinematic-postprocessing-budget" data-render-budget-quality-tier={qualityTier} data-render-budget-bloom-enabled={bloomEnabled ? 'true' : 'false'} data-render-budget-chromatic-aberration-enabled={chromaticAberrationEnabled ? 'true' : 'false'} */}
      <EffectComposer multisampling={0} enabled={active}>
        {effects}
      </EffectComposer>
    </group>
  )
}
