'use client'

import { Mesh } from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function HomeOrb() {
  const ref = useRef<Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = 0.95 + Math.sin(t * 0.28) * 0.025
  })

  return (
    <>
      <mesh ref={ref} position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.48, 48, 48]} />
        <meshStandardMaterial
          color="#18222d"
          emissive="#5db8ff"
          emissiveIntensity={0.28}
          roughness={0.42}
          metalness={0.08}
        />
      </mesh>

      <pointLight position={[0, 1.05, 0.45]} intensity={0.85} distance={8} decay={2} />
    </>
  )
}
