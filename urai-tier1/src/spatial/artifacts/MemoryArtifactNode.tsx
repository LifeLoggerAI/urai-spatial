'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AAA_MOONLIT_PALETTE, SacredGlassMaterial, SealedProgressionMaterial } from '../visual/aaaMaterials'

export type MemoryArtifactRarity = 'common' | 'rare' | 'mythic'
export type MemoryArtifactTone = 'calm' | 'recovery' | 'shadow' | 'threshold' | 'joy' | string

export type MemoryArtifactNodeProps = {
  id: string
  title: string
  selected?: boolean
  dimmed?: boolean
  locked?: boolean
  rarity?: MemoryArtifactRarity
  tone?: MemoryArtifactTone
  color?: string
  auraColor?: string
  size?: number
  onSelect?: () => void
}

const rarityScale: Record<MemoryArtifactRarity, number> = {
  common: 0.9,
  rare: 1.08,
  mythic: 1.28,
}

const rarityShellOpacity: Record<MemoryArtifactRarity, number> = {
  common: 0.07,
  rare: 0.11,
  mythic: 0.16,
}

function toneColor(tone?: MemoryArtifactTone, fallback = AAA_MOONLIT_PALETTE.paleCyan) {
  if (tone === 'recovery') return '#86efac'
  if (tone === 'shadow') return '#c084fc'
  if (tone === 'threshold') return AAA_MOONLIT_PALETTE.sacredGold
  if (tone === 'joy') return '#fde68a'
  if (tone === 'calm') return '#bae6fd'
  return fallback
}

export default function MemoryArtifactNode({
  id,
  title,
  selected = false,
  dimmed = false,
  locked = false,
  rarity = 'rare',
  tone = 'calm',
  color,
  auraColor,
  size = 1,
  onSelect,
}: MemoryArtifactNodeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const accentColor = color ?? toneColor(tone)
  const haloColor = auraColor ?? accentColor
  const rarityBoost = rarityScale[rarity]
  const opacityGate = dimmed ? 0.36 : 1

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pulse = 1 + Math.sin(t * (selected ? 2.1 : 1.15) + size) * (selected ? 0.06 : 0.025)
    if (groupRef.current) {
      groupRef.current.rotation.y = t * (locked ? 0.035 : rarity === 'mythic' ? 0.12 : 0.075)
      groupRef.current.rotation.z = Math.sin(t * 0.23 + size) * 0.035
      groupRef.current.scale.setScalar(size * rarityBoost * pulse * (selected ? 1.24 : 1))
    }
    if (coreRef.current) coreRef.current.rotation.x = t * 0.18
    if (shellRef.current) shellRef.current.rotation.y = -t * 0.09
    if (ringRef.current) ringRef.current.rotation.z = t * (locked ? 0.025 : 0.16)
  })

  return (
    <group
      ref={groupRef}
      name={`urai-memory-artifact-${id}`}
      data-testid="urai-memory-artifact-node"
      userData={{ artifactId: id, artifactTitle: title, artifactRarity: rarity, locked }}
    >
      <mesh scale={[1.9, 1.9, 1.9]}>
        <sphereGeometry args={[0.2, 32, 20]} />
        <meshBasicMaterial color={haloColor} transparent opacity={(selected ? 0.24 : rarityShellOpacity[rarity]) * opacityGate} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={shellRef} scale={[0.92, 1.18, 0.92]}>
        <octahedronGeometry args={[0.25, rarity === 'common' ? 1 : 2]} />
        <SacredGlassMaterial color={haloColor} opacity={(selected ? 0.22 : 0.13) * opacityGate} emissiveIntensity={selected ? 0.42 : 0.24} />
      </mesh>

      <mesh ref={coreRef} onClick={(event) => { event.stopPropagation(); if (!locked) onSelect?.() }}>
        <icosahedronGeometry args={[0.145, rarity === 'mythic' ? 3 : 2]} />
        <meshPhysicalMaterial
          color={locked ? AAA_MOONLIT_PALETTE.reflectiveStone : '#eef6ff'}
          roughness={locked ? 0.34 : 0.14}
          metalness={locked ? 0.38 : 0.18}
          clearcoat={0.84}
          clearcoatRoughness={0.12}
          emissive={accentColor}
          emissiveIntensity={(locked ? 0.18 : selected ? 2.8 : 1.25) * opacityGate}
          transparent
          opacity={locked ? 0.62 : dimmed ? 0.42 : 1}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, rarity === 'mythic' ? 0.007 : 0.005, 8, 96]} />
        {locked ? <SealedProgressionMaterial major={rarity !== 'common'} activated={false} /> : <meshBasicMaterial color={rarity === 'mythic' ? AAA_MOONLIT_PALETTE.sacredGold : AAA_MOONLIT_PALETTE.paleCyan} transparent opacity={(selected ? 0.38 : 0.18) * opacityGate} depthWrite={false} blending={THREE.AdditiveBlending} />}
      </mesh>

      {rarity !== 'common' ? (
        <mesh rotation={[0.86, 0, 0.2]}>
          <torusGeometry args={[0.43, 0.004, 8, 112]} />
          <meshBasicMaterial color={AAA_MOONLIT_PALETTE.moonSilver} transparent opacity={(selected ? 0.22 : 0.09) * opacityGate} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ) : null}
    </group>
  )
}
