'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ConsciousOrbMaterial } from './ConsciousOrbMaterial'

export default function Orb() {
  const meshRef = useRef<THREE.Mesh | null>(null)
  const materialRef = useRef<any>(null)

  useFrame((state) => {
    const mesh = meshRef.current
    const material = materialRef.current
    if (!mesh || !material) return

    const t = state.clock.elapsedTime

    const scale = 1 + Math.sin(t * 1.2) * 0.02
    mesh.scale.setScalar(scale)
    mesh.rotation.y = t * 0.12

    material.uTime = t
    material.uEnergy = 1.0 + Math.sin(t * 0.9) * 0.08
  })

  return (
    <mesh ref={meshRef} position={[0, -1.5, 0]}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <consciousOrbMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}