'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function AtmosphereStars() {
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const starCount = 300
    const pos = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const radius = 150 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const i3 = i * 3

      pos[i3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i3 + 1] = radius * Math.cos(phi)
      pos[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }

    return pos
  }, [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const t = clock.getElapsedTime()

    // Ultra-slow global field drift. Values are extremely small to be imperceptible.
    pointsRef.current.position.x = Math.sin(t * 0.005) * 0.01
    pointsRef.current.position.y = Math.cos(t * 0.004) * 0.008
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        sizeAttenuation
        color="#bfe9ff"
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  )
}
