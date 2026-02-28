'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const breathe = 1 + Math.sin(t * 1.2) * 0.04
    meshRef.current.scale.set(breathe, breathe, breathe)
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshStandardMaterial
          color="#e6ebff"
          roughness={0.08}
          metalness={0.4}
          emissive="#1e3a8a"
          emissiveIntensity={0.8}
        />
      </mesh>

      <mesh scale={1.25}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
