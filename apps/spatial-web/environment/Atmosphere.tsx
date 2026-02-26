
'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const particleCount = 2000 // Density of the mist
const particleSize = 0.1 // Size of the mist particles

export default function Atmosphere() {
  const ref = useRef<THREE.Points>(null!)

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const colorA = new THREE.Color('#3a0a2e') // Deep purple
    const colorB = new THREE.Color('#020817') // Dark blue

    for (let i = 0; i < particleCount; i++) {
      // Position particles in a sphere
      const theta = THREE.MathUtils.randFloat(0, 2 * Math.PI)
      const phi = Math.acos(2 * THREE.MathUtils.randFloat(0, 1) - 1)
      const radius = THREE.MathUtils.randFloat(8, 20) // Distribute between a range

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      positions.set([x, y, z], i * 3)

      // Color particles based on their position (e.g., blend colors)
      const color = colorA.clone().lerp(colorB, Math.abs(y / 20)) // Example of color blending
      colors.set([color.r, color.g, color.b], i * 3)
    }

    return [positions, colors]
  }, [])

  useFrame(({ clock }) => {
    // Subtle undulating motion
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.2
    ref.current.rotation.y = Math.cos(clock.getElapsedTime() * 0.1) * 0.2
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        vertexColors
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
