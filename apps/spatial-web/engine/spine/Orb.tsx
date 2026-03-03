'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((r3fState) => {
    if (!meshRef.current) return
    const t = r3fState.clock.getElapsedTime()
    meshRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.02)
  })

  return (
    <group position={[0, 1.25, 0]} onClick={(e) => e.stopPropagation()}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.85, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.92}
          metalness={0.2}
          emissive="#8ab4ff"
          emissiveIntensity={0.6}
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


