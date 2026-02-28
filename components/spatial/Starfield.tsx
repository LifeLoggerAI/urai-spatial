'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Starfield() {
  const points = useRef<THREE.Points>(null!)

  const positions = useMemo(() => {
    const arr = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40
      arr[i * 3 + 2] = -Math.random() * 50
    }
    return arr
  }, [])

  useFrame(() => {
    if (points.current) {
      points.current.rotation.y += 0.0005
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#8899ff" />
    </points>
  )
}
