'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

interface Props {
  position: [number, number, number]
}

export default function MomentContainer({ position }: Props) {
  const meshRef = useRef<Mesh>(null!)
  const scaleRef = useRef(0)

  useFrame((_, delta) => {
    scaleRef.current += delta * 1.2
    scaleRef.current = Math.min(scaleRef.current, 1)

    if (meshRef.current) {
      const s = 1 + scaleRef.current * 4
      meshRef.current.scale.set(s, s, s)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        emissive="#ffffff"
        emissiveIntensity={3}
        toneMapped={false}
      />
    </mesh>
  )
}
