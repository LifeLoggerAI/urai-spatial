'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 500
const SEED = 1337

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function ForegroundDust() {
  const pointsRef = useRef<THREE.Points>(null!)

  const particles = useMemo(() => {
    const rand = mulberry32(SEED)
    const arr = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 0] = (rand() - 0.5) * 6
      arr[i * 3 + 1] = (rand() - 0.5) * 4
      arr[i * 3 + 2] = -rand() * 4 + 1
    }

    return arr
  }, [])

  useFrame((state, delta) => {
    const points = pointsRef.current
    if (!points) return

    points.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.05
    points.rotation.y += delta * 0.002
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={particles.length / 3}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.02}
        transparent
        opacity={0.25}
        depthWrite={false}
        color="#ffe6c7"
      />
    </points>
  )
}