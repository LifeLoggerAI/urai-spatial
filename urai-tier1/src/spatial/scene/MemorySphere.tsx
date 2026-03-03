'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../state/sceneStore'

export default function MemorySphere() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { mode } = useSceneStore()

  useFrame((state) => {
    if (!meshRef.current) return
    if (mode === 'memory' || mode === 'replay') {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.02
      meshRef.current.scale.setScalar(pulse)
    }
  })

  if (mode !== 'memory' && mode !== 'replay') return null

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3, 64, 64]} />
      <meshPhysicalMaterial
        transmission={0.6}
        roughness={0.3}
        emissive="#88aaff"
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}
