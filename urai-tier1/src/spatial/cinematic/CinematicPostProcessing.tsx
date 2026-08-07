'use client'

import { EffectComposer, Bloom, Vignette, ChromaticAberration, DepthOfField } from '@react-three/postprocessing'
import { useThree } from '@react-three/fiber'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import { useEffect, useMemo, type ReactElement } from 'react'
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
  const { gl, scene } = useThree()
  const sharedVisualBudget = useSharedHomeSceneVisualBudget()
  const prefersReducedMotion = useReducedMotion()
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion
  const resolvedBudget = useMemo(
    () => budget ?? sharedVisualBudget?.budget ?? resolveSpatialRenderBudget({ reducedMotion: effectiveReducedMotion, qualityTier: effectiveReducedMotion ? 'low' : 'high' }),
    [budget, sharedVisualBudget, effectiveReducedMotion],
  )

  useEffect(() => {
    const lifeMapOwner = gl.domElement.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
    if (!active && !lifeMapOwner) return
    const previousAutoReset = gl.info.autoReset
    gl.info.autoReset = false
    gl.info.reset()

    if (!lifeMapOwner) {
      return () => {
        gl.info.autoReset = previousAutoReset
        gl.info.reset()
      }
    }

    const originalRender = gl.render.bind(gl)
    let completedFrames = 0
    gl.render = ((sceneArg, cameraArg) => {
      originalRender(sceneArg, cameraArg)
      completedFrames += 1
      if (completedFrames < 2) return

      let objects = 0
      let anchors = 0
      scene.traverse((object) => {
        if (object.visible) objects += 1
        if (object.visible && object.name.startsWith('life-map-')) anchors += 1
      })
      const calls = gl.info.render.calls
      const triangles = gl.info.render.triangles
      lifeMapOwner.dataset.lifeMapRenderReady = calls > 0 && objects > 20 && anchors >= 8 ? 'true' : 'false'
      lifeMapOwner.dataset.lifeMapVisibleObjects = String(objects)
      lifeMapOwner.dataset.lifeMapVisibleAnchors = String(anchors)
      lifeMapOwner.dataset.lifeMapRenderCalls = String(calls)
      lifeMapOwner.dataset.lifeMapRenderTriangles = String(triangles)
    }) as typeof gl.render

    return () => {
      gl.render = originalRender
      gl.info.autoReset = previousAutoReset
      gl.info.reset()
    }
  }, [active, gl, scene])

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