'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

export default function Orb() {
  const orbRef = useRef<THREE.Mesh>(null)
  const auraRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * 1.12) * 0.035
    const pulse = 1 + Math.sin(t * 0.72 + 0.6) * 0.08

    if (orbRef.current) {
      orbRef.current.position.y = -0.2 + Math.sin(t * 0.86) * 0.045
      orbRef.current.scale.setScalar(breath)
      orbRef.current.rotation.y = t * 0.16
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar(1.55 * pulse)
      auraRef.current.rotation.z = t * 0.08
    }

    if (haloRef.current) {
      haloRef.current.scale.set(2.3 + Math.sin(t * 0.64) * 0.1, 2.3 + Math.cos(t * 0.52) * 0.08, 1)
      haloRef.current.rotation.z = Math.sin(t * 0.24) * 0.12
    }
  })

  return (
    <group position={[0, -0.18, -1.2]}>
      <pointLight position={[0, 0.15, 0.1]} intensity={1.8} color="#cbb6ff" distance={5.8} />

      <mesh ref={haloRef} rotation={[0, 0, 0]} position={[0, 0, -0.08]}>
        <circleGeometry args={[0.72, 64]} />
        <meshBasicMaterial color="#8edcff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={auraRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.54, 64, 64]} />
        <meshBasicMaterial color="#9b7cff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={orbRef} castShadow>
        <sphereGeometry args={[0.38, 64, 64]} />
        <meshStandardMaterial
          color="#f4f6ff"
          emissive="#d7c5ff"
          emissiveIntensity={0.72}
          metalness={0.08}
          roughness={0.24}
        />
      </mesh>

      <mesh position={[-0.12, 0.14, 0.28]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.72} />
      </mesh>
    </group>
  )
}
