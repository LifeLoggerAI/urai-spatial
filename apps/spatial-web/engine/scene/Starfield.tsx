'use client'

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Starfield() {
  const ref = useRef<THREE.Points>(null!)

  const stars = useMemo(() => {
    const starCount = 2000
    const positions = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const r = 400
      const theta = Math.random() * 2 * Math.PI
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }

    return positions
  }, [])

  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.01
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={stars.length / 3}
          array={stars}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        color="#88aaff"
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  )
}
