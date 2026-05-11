'use client'

import * as THREE from 'three'

export type UraiSpatialQualityTier = 'low' | 'medium' | 'high'
export type UraiReflectionMode = 'off' | 'faked' | 'planar'
export type UraiAtmosphereMode = 'minimal' | 'layered' | 'volumetric-look'

export const AAA_MOONLIT_PALETTE = {
  voidNavy: '#030713',
  deepNavy: '#071126',
  blueViolet: '#151742',
  blackStone: '#05070d',
  reflectiveStone: '#080b14',
  moonSilver: '#dbeafe',
  paleCyan: '#9be8ff',
  sacredGold: '#e7d59d',
  mistBlue: '#8fb7ff',
} as const

export type SpatialRenderBudget = {
  qualityTier: UraiSpatialQualityTier
  maxDpr: number
  particleBudget: number
  shadowMapSize: 1024 | 1536 | 2048
  bloomEnabled: boolean
  chromaticAberrationEnabled: boolean
  reflectionMode: UraiReflectionMode
  atmosphereMode: UraiAtmosphereMode
  maxHtmlLabels: number
}

export function resolveSpatialRenderBudget({
  qualityTier = 'high',
  reducedMotion = false,
}: {
  qualityTier?: UraiSpatialQualityTier
  reducedMotion?: boolean
}): SpatialRenderBudget {
  if (qualityTier === 'low' || reducedMotion) {
    return {
      qualityTier: 'low',
      maxDpr: 1.15,
      particleBudget: 240,
      shadowMapSize: 1024,
      bloomEnabled: !reducedMotion,
      chromaticAberrationEnabled: false,
      reflectionMode: 'faked',
      atmosphereMode: 'minimal',
      maxHtmlLabels: 3,
    }
  }

  if (qualityTier === 'medium') {
    return {
      qualityTier: 'medium',
      maxDpr: 1.45,
      particleBudget: 720,
      shadowMapSize: 1536,
      bloomEnabled: true,
      chromaticAberrationEnabled: false,
      reflectionMode: 'faked',
      atmosphereMode: 'layered',
      maxHtmlLabels: 6,
    }
  }

  return {
    qualityTier: 'high',
    maxDpr: 1.75,
    particleBudget: 1280,
    shadowMapSize: 2048,
    bloomEnabled: true,
    chromaticAberrationEnabled: false,
    reflectionMode: 'planar',
    atmosphereMode: 'volumetric-look',
    maxHtmlLabels: 8,
  }
}

export function MoonlitBlackStoneMaterial({
  emissiveIntensity = 0.16,
  reflective = true,
  transparent = false,
  opacity = 1,
}: {
  emissiveIntensity?: number
  reflective?: boolean
  transparent?: boolean
  opacity?: number
}) {
  return (
    <meshPhysicalMaterial
      color={AAA_MOONLIT_PALETTE.blackStone}
      roughness={reflective ? 0.16 : 0.34}
      metalness={reflective ? 0.58 : 0.22}
      clearcoat={reflective ? 0.78 : 0.24}
      clearcoatRoughness={reflective ? 0.18 : 0.36}
      reflectivity={reflective ? 0.72 : 0.32}
      emissive={AAA_MOONLIT_PALETTE.deepNavy}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent}
      opacity={opacity}
    />
  )
}

export function SacredGlassMaterial({
  color = AAA_MOONLIT_PALETTE.paleCyan,
  opacity = 0.18,
  emissiveIntensity = 0.28,
}: {
  color?: string
  opacity?: number
  emissiveIntensity?: number
}) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.08}
      metalness={0.06}
      transmission={0.18}
      thickness={0.45}
      clearcoat={0.92}
      clearcoatRoughness={0.08}
      emissive={color}
      emissiveIntensity={emissiveIntensity}
      transparent
      opacity={opacity}
      depthWrite={false}
      side={THREE.DoubleSide}
      blending={THREE.AdditiveBlending}
    />
  )
}

export function SealedProgressionMaterial({
  major = false,
  activated = false,
}: {
  major?: boolean
  activated?: boolean
}) {
  return (
    <meshBasicMaterial
      color={activated ? AAA_MOONLIT_PALETTE.paleCyan : major ? AAA_MOONLIT_PALETTE.sacredGold : AAA_MOONLIT_PALETTE.moonSilver}
      transparent
      opacity={activated ? 0.42 : major ? 0.25 : 0.12}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
    />
  )
}

export function MistLightMaterial({
  color = AAA_MOONLIT_PALETTE.mistBlue,
  opacity = 0.08,
}: {
  color?: string
  opacity?: number
}) {
  return (
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      side={THREE.DoubleSide}
    />
  )
}

export function makeProceduralStoneNormalTexture() {
  const size = 64
  const data = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4
      const vein = Math.sin(x * 0.41 + y * 0.19) * 0.5 + Math.sin(x * 0.08 - y * 0.53) * 0.5
      const micro = Math.sin((x + y) * 1.73) * 0.18
      const v = Math.max(-1, Math.min(1, vein * 0.34 + micro))
      data[i] = 128 + v * 20
      data[i + 1] = 128 + v * 16
      data[i + 2] = 210
      data[i + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(18, 18)
  texture.anisotropy = 4
  return texture
}
