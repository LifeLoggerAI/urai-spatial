'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import {
  AAA_MOONLIT_PALETTE,
  makeProceduralStoneNormalTexture,
  MistLightMaterial,
  MoonlitBlackStoneMaterial,
  SacredGlassMaterial,
  SpatialRenderBudget,
  UraiReflectionMode,
  resolveSpatialRenderBudget,
} from '../spatial/visual/aaaMaterials'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'
import { useSharedHomeSceneVisualBudget } from './homeSceneVisualBudgetContext'

function HorizonMist({ reducedMotion }: { reducedMotion: boolean }) {
  const bands = reducedMotion ? 2 : 4

  return (
    <group>
      {Array.from({ length: bands }).map((_, index) => (
        <mesh key={index} position={[0, -0.66 + index * 0.08, -12.4 - index * 2.4]} rotation={[-0.13 - index * 0.018, 0, 0]}>
          <planeGeometry args={[86 - index * 8, 3.8 + index * 0.55]} />
          <MistLightMaterial color={index % 2 === 0 ? AAA_MOONLIT_PALETTE.mistBlue : AAA_MOONLIT_PALETTE.paleCyan} opacity={reducedMotion ? 0.035 : 0.055 - index * 0.007} />
        </mesh>
      ))}
    </group>
  )
}

function MoonlitVeins({ reducedMotion }: { reducedMotion: boolean }) {
  const veinCount = reducedMotion ? 4 : 9

  return (
    <group>
      {Array.from({ length: veinCount }).map((_, index) => {
        const x = -13.5 + index * 3.35
        const z = -5.1 - (index % 3) * 1.35
        const width = index % 4 === 0 ? 0.022 : 0.012
        const opacity = index % 4 === 0 ? 0.09 : 0.045

        return (
          <mesh key={index} position={[x, -0.812, z]} rotation={[-Math.PI / 2, 0, 0.42 - index * 0.07]}>
            <planeGeometry args={[width, 13.8]} />
            <meshBasicMaterial
              color={index % 3 === 0 ? AAA_MOONLIT_PALETTE.sacredGold : AAA_MOONLIT_PALETTE.paleCyan}
              transparent
              opacity={opacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function ReflectionPool({ reflectionMode }: { reflectionMode: UraiReflectionMode }) {
  if (reflectionMode === 'off') return null

  return (
    <group data-testid="urai-ground-reflection-pool" data-reflection-mode={reflectionMode}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.806, -3.2]} receiveShadow>
        <circleGeometry args={[16.8, 192]} />
        <meshPhysicalMaterial
          color={AAA_MOONLIT_PALETTE.reflectiveStone}
          roughness={reflectionMode === 'planar' ? 0.08 : 0.14}
          metalness={0.7}
          clearcoat={0.94}
          clearcoatRoughness={0.09}
          reflectivity={0.84}
          emissive={AAA_MOONLIT_PALETTE.deepNavy}
          emissiveIntensity={0.12}
          transparent
          opacity={0.78}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.802, -3.2]}>
        <ringGeometry args={[5.4, 16.7, 192]} />
        <SacredGlassMaterial color={AAA_MOONLIT_PALETTE.paleCyan} opacity={reflectionMode === 'planar' ? 0.052 : 0.035} emissiveIntensity={0.22} />
      </mesh>
    </group>
  )
}

export default function Ground({
  reducedMotion,
  reflectionMode,
  budget,
}: {
  reducedMotion?: boolean
  reflectionMode?: UraiReflectionMode
  budget?: SpatialRenderBudget
}) {
  const sharedVisualBudget = useSharedHomeSceneVisualBudget()
  const prefersReducedMotion = useReducedMotion()
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion
  const resolvedBudget = useMemo(
    () => budget ?? sharedVisualBudget?.budget ?? resolveSpatialRenderBudget({ reducedMotion: effectiveReducedMotion, qualityTier: effectiveReducedMotion ? 'low' : 'high' }),
    [budget, sharedVisualBudget, effectiveReducedMotion],
  )
  const effectiveReflectionMode = reflectionMode ?? resolvedBudget.reflectionMode
  const normalMap = useMemo(() => makeProceduralStoneNormalTexture(), [])

  return (
    <group
      data-testid="urai-reflective-black-stone-ground"
      data-render-budget-reflection-mode={effectiveReflectionMode}
      data-render-budget-atmosphere-mode={resolvedBudget.atmosphereMode}
      data-render-budget-quality-tier={resolvedBudget.qualityTier}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, -4.8]} receiveShadow>
        <planeGeometry args={[96, 96, 1, 1]} />
        <meshPhysicalMaterial
          color={AAA_MOONLIT_PALETTE.blackStone}
          roughness={0.2}
          metalness={0.52}
          clearcoat={0.76}
          clearcoatRoughness={0.18}
          reflectivity={0.62}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.1, 0.1)}
          emissive={AAA_MOONLIT_PALETTE.deepNavy}
          emissiveIntensity={0.12}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2.18, 0, 0]} position={[0, -0.72, -13.5]} receiveShadow>
        <planeGeometry args={[88, 18, 1, 1]} />
        <MoonlitBlackStoneMaterial emissiveIntensity={0.13} reflective={effectiveReflectionMode !== 'off'} transparent opacity={0.84} />
      </mesh>

      <ReflectionPool reflectionMode={effectiveReflectionMode} />
      <MoonlitVeins reducedMotion={effectiveReducedMotion} />
      <HorizonMist reducedMotion={effectiveReducedMotion} />

      <mesh position={[0, -0.83, -6.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 12.5, 160]} />
        <SacredGlassMaterial color={AAA_MOONLIT_PALETTE.paleCyan} opacity={0.032} emissiveIntensity={0.18} />
      </mesh>

      <mesh position={[0, -0.78, -18.5]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[96, 5.2]} />
        <MistLightMaterial color={AAA_MOONLIT_PALETTE.sacredGold} opacity={0.045} />
      </mesh>
    </group>
  )
}
