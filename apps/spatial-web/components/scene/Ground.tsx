'use client'

import { useRef } from 'react'
import { Mesh } from 'three'

export default function Ground() {
  const meshRef = useRef<Mesh>(null)

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1, 0]}
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial
        color="#0a0f1c"
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  )
}
