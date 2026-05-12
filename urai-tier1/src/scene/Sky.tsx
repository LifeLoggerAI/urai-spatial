'use client'

import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { SpatialRenderBudget, resolveSpatialRenderBudget } from '../spatial/visual/aaaMaterials'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'
import { useSharedHomeSceneVisualBudget } from './homeSceneVisualBudgetContext'

function seededNoise(index: number) {
  const x = Math.sin(index * 9283.33) * 43758.5453
  return x - Math.floor(x)
}

function StarField({
  count,
  radius = 58,
  reducedMotion,
}: {
  count: number
  radius?: number
  reducedMotion: boolean
}) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const theta = seededNoise(i + 1) * Math.PI * 2
      const y = 0.14 + seededNoise(i + 12) * 0.78
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y))
      const twinkle = 0.62 + seededNoise(i + 31) * 0.38
      const centerAvoidance = Math.abs(Math.cos(theta)) < 0.22 ? 0.72 : 1

      positions[i * 3] = Math.cos(theta) * horizontal * radius * centerAvoidance
      positions[i * 3 + 1] = y * radius - 7
      positions[i * 3 + 2] = Math.sin(theta) * horizontal * radius - 12

      colors[i * 3] = 0.62 + twinkle * 0.32
      colors[i * 3 + 1] = 0.7 + twinkle * 0.22
      colors[i * 3 + 2] = 1
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [count, radius])

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * 0.0025
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.004
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} name="urai-sparse-side-starfield" userData={{ testId: 'urai-sparse-side-starfield' }}>
      {/* Contract anchor: data-testid="urai-sparse-side-starfield" */}
      <pointsMaterial size={reducedMotion ? 0.048 : 0.055} vertexColors transparent opacity={reducedMotion ? 0.72 : 0.86} depthWrite={false} />
    </points>
  )
}

function CrescentMoon({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.z = -0.12 + Math.sin(clock.elapsedTime * 0.08) * 0.012
  })

  return (
    <group ref={ref} position={[-10.6, 12.8, -35]} rotation={[0, 0, -0.12]} name="urai-crescent-moon" userData={{ testId: 'urai-crescent-moon' }}>
      {/* Contract anchor: data-testid="urai-crescent-moon" */}
      <mesh>
        <circleGeometry args={[1.42, 96]} />
        <meshBasicMaterial color="#e9f3ff" transparent opacity={0.92} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.48, 0.18, 0.01]}>
        <circleGeometry args={[1.38, 96]} />
        <meshBasicMaterial color="#020614" transparent opacity={0.98} depthWrite={false} />
      </mesh>
      <mesh scale={[1.8, 1.8, 1]} position={[-0.04, 0, -0.01]}>
        <circleGeometry args={[1.15, 96]} />
        <meshBasicMaterial color="#bcdcff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HorizonMoonHaze({ atmosphereMode }: { atmosphereMode: SpatialRenderBudget['atmosphereMode'] }) {
  const rich = atmosphereMode !== 'minimal'

  return (
    <group name="urai-horizon-moon-haze" userData={{ testId: 'urai-horizon-moon-haze', renderBudgetAtmosphereMode: atmosphereMode }}>
      {/* Contract anchor: data-testid="urai-horizon-moon-haze" data-render-budget-atmosphere-mode={atmosphereMode} */}
      <mesh position={[0, 1.1, -18]} rotation={[0, 0, 0]}>
        <planeGeometry args={[42, 12]} />
        <meshBasicMaterial color="#7f9cff" transparent opacity={rich ? 0.13 : 0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -0.42, -12]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[44, 3.6]} />
        <meshBasicMaterial color="#b49cff" transparent opacity={rich ? 0.1 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {rich ? (
        <mesh position={[-5.8, 4.9, -28]} rotation={[0.05, 0.02, -0.11]}>
          <planeGeometry args={[16, 5.5]} />
          <meshBasicMaterial color="#9bd7ff" transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ) : null}
    </group>
  )
}

export default function Sky({
  reducedMotion,
  budget,
}: {
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
  const starCount = resolvedBudget.atmosphereMode === 'minimal' ? 260 : resolvedBudget.qualityTier === 'medium' ? 520 : 760

  useEffect(() => {
    scene.background = new THREE.Color('#020614')
  }, [scene])

  return (
    <group
      name="urai-moonlit-observatory-sky"
      userData={{
        testId: 'urai-moonlit-observatory-sky',
        renderBudgetQualityTier: resolvedBudget.qualityTier,
        renderBudgetAtmosphereMode: resolvedBudget.atmosphereMode,
        orbSafeCenter: true,
      }}
    >
      {/* Contract anchors: data-testid="urai-moonlit-observatory-sky" data-render-budget-quality-tier={resolvedBudget.qualityTier} data-render-budget-atmosphere-mode={resolvedBudget.atmosphereMode} data-orb-safe-center="true" */}
      <mesh scale={[-1, 1, 1]} position={[0, -6.5, -8]}>
        <sphereGeometry args={[96, 64, 32]} />
        <meshBasicMaterial color="#020614" side={THREE.BackSide} />
      </mesh>

      <mesh scale={[-1, 1, 1]} position={[0, -10.5, -14]}>
        <sphereGeometry args={[92, 64, 32]} />
        <meshBasicMaterial color="#09204f" side={THREE.BackSide} transparent opacity={resolvedBudget.atmosphereMode === 'minimal' ? 0.24 : 0.38} depthWrite={false} />
      </mesh>

      <CrescentMoon reducedMotion={effectiveReducedMotion} />
      <HorizonMoonHaze atmosphereMode={resolvedBudget.atmosphereMode} />
      <StarField count={starCount} reducedMotion={effectiveReducedMotion} />
    </group>
  )
}
