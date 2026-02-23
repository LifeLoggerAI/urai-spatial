'use client'
import { Mesh, SphereGeometry, MeshStandardMaterial } from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

export default function Orb() {
  const orbRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)

  useFrame((state) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += 0.1 * state.clock.getDelta()
    }
    if (materialRef.current) {
      // 5. Glow That Breathes: Subtle animation for emissive intensity
      materialRef.current.emissiveIntensity =
        0.35 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    }
  })

  return (
    <group position={[0, 1, 0]}>
      {/* Main Orb Mesh */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        {/* 1. Upgraded Base Material */}
        <meshStandardMaterial
          ref={materialRef}
          color="#2a8cff"
          roughness={0.35}
          metalness={0.05}
          emissive="#0d2b5e"
          emissiveIntensity={0.4} // Base intensity
        />
      </mesh>

      {/* 2. Subtle Fresnel Rim (Atmospheric Edge) */}
      <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshBasicMaterial
          color="#4da3ff"
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  )
}
