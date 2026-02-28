'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEmotionStore } from '../state/emotion-store'

export default function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const { state, intensity } = useEmotionStore()

  useFrame((r3fState) => {
    const t = r3fState.clock.getElapsedTime()
    const breathe = 1 + Math.sin(t * 1.0) * 0.015
    meshRef.current.scale.set(breathe, breathe, breathe)

    if (!materialRef.current) return

    const base = 0.8

    let multiplier = 1

    switch (state) {
      case 'breakthrough':
        multiplier = 1.4
        break
      case 'clarity':
        multiplier = 1.2
        break
      case 'growth':
        multiplier = 1.1
        break
      case 'grief':
        multiplier = 0.7
        break
      case 'trauma':
        multiplier = 0.6
        break
      case 'anxiety':
        multiplier = 0.9
        break
      case 'recovery':
        multiplier = 1.05
        break
      default:
        multiplier = 1
    }

    const target =
      base * multiplier * (0.85 + intensity * 0.4)

    materialRef.current.emissiveIntensity +=
      (target - materialRef.current.emissiveIntensity) * 0.08
  })

  return (
    <group position={[0, 1.25, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.85, 64, 64]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#f4f7ff"
          roughness={0.92}
          metalness={0.2}
          emissive="#1e3a8a"
          emissiveIntensity={0.45}
        />
      </mesh>

      <mesh scale={[1.12]}>
        <sphereGeometry args={[0.85, 64, 64]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
