'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Orb() {
  const mesh = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (mesh.current) {
      mesh.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.02)
      mesh.current.rotation.y += 0.002
    }
  })

  return (
    <mesh ref={mesh} position={[0, -1.5, 0]}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshPhysicalMaterial
        transmission={1}
        roughness={0.15}
        thickness={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        reflectivity={0.8}
        color="#6c7cff"
        emissive="#3a4cff"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}
