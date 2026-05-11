'use client'

import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { SpatialRenderBudget, resolveSpatialRenderBudget } from '../spatial/visual/aaaMaterials'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'
import { useSharedHomeSceneVisualBudget } from './homeSceneVisualBudgetContext'

type AtmosphereMode = 'home' | 'life-map' | 'focus' | 'replay' | 'mirror' | 'unwind' | 'ascent' | 'demo'

function FogBand({
  position,
  width,
  height,
  opacity,
  color,
  drift = 0.035,
  reducedMotion,
}: {
  position: [number, number, number]
  width: number
  height: number
  opacity: number
  color: string
  drift?: number
  reducedMotion: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    const t = clock.elapsedTime
    ref.current.position.x = position[0] + Math.sin(t * drift + position[2]) * 0.42
    ref.current.rotation.z = Math.sin(t * drift * 0.7 + position[0]) * 0.018
  })

  return (
    <mesh ref={ref} position={position} rotation={[-0.04, 0, 0]}>
      <planeGeometry args={[width, height, 1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={reducedMotion ? opacity * 0.72 : opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function MoonlightShaft({
  position,
  rotation,
  opacity,
  color,
  reducedMotion,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  opacity: number
  color: string
  reducedMotion: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.material.opacity = opacity + Math.sin(clock.elapsedTime * 0.18 + position[0]) * 0.01
  })

  return (
    <mesh ref={ref} position={position} rotation={rotation} data-testid="urai-moonlight-shaft">
      <coneGeometry args={[1.4, 10.5, 48, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={reducedMotion ? opacity * 0.55 : opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function fogDensityFor(mode: AtmosphereMode, budget: SpatialRenderBudget, reducedMotion: boolean) {
  if (budget.atmosphereMode === 'minimal' || reducedMotion) return 0.024
  if (mode === 'focus') return 0.046
  if (mode === 'replay') return 0.052
  if (mode === 'mirror') return 0.044
  if (mode === 'life-map' || mode === 'demo') return 0.034
  return 0.038
}

export default function Atmosphere({
  mode = 'home',
  reducedMotion,
  budget,
}: {
  mode?: AtmosphereMode
  reducedMotion?: boolean
  budget?: SpatialRenderBudget
}) {
  const { scene } = useThree()
  const sharedVisualBudget = useSharedHomeSceneVisualBudget()
  const prefersReducedMotion = useReducedMotion()
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion
  const resolvedBudget = useMemo(
    () => budget ?? sharedVisualBudget?.budget ?? resolveSpatialRenderBudget({ reducedMotion: effectiveReducedMotion, qualityTier: effectiveReducedMotion ? 'low' : 'high' }),
    [budget, sharedVisualBudget, effectiveReducedMotion],
  )
  const effectiveMode = mode ?? sharedVisualBudget?.mode ?? 'home'
  const density = fogDensityFor(effectiveMode, resolvedBudget, effectiveReducedMotion)
  const richAtmosphere = resolvedBudget.atmosphereMode !== 'minimal'

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#071023', density)
    return () => {
      scene.fog = null
    }
  }, [density, scene])

  return (
    <group
      data-testid="urai-volumetric-look-atmosphere"
      data-atmosphere-mode={effectiveMode}
      data-render-budget-atmosphere-mode={resolvedBudget.atmosphereMode}
      data-render-budget-fog-density={density}
    >
      <FogBand position={[0, -0.28, -9.6]} width={38} height={2.2} opacity={0.075} color="#87b8ff" reducedMotion={effectiveReducedMotion} />
      <FogBand position={[-2.8, -0.02, -13.2]} width={44} height={3.4} opacity={0.052} color="#b69cff" drift={0.024} reducedMotion={effectiveReducedMotion} />
      <FogBand position={[3.2, 0.3, -17.4]} width={52} height={4.8} opacity={0.04} color="#6ee7ff" drift={0.018} reducedMotion={effectiveReducedMotion} />
      <FogBand position={[0, -0.72, -5.6]} width={22} height={1.2} opacity={0.06} color="#ffffff" drift={0.045} reducedMotion={effectiveReducedMotion} />

      {richAtmosphere ? (
        <>
          <MoonlightShaft position={[-4.8, 4.2, -15.6]} rotation={[0.6, 0.1, -0.38]} opacity={0.042} color="#b9d8ff" reducedMotion={effectiveReducedMotion} />
          <MoonlightShaft position={[5.4, 3.2, -18.8]} rotation={[0.54, -0.08, 0.42]} opacity={0.03} color="#a6f2ff" reducedMotion={effectiveReducedMotion} />
        </>
      ) : null}
    </group>
  )
}
