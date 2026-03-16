'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 4000

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export default function MidStars() {
  const pointsRef = useRef<THREE.Points | null>(null)

  const particles = useMemo(() => {
    const rand = seededRandom(12345)
    const arr = new Float32Array(STAR_COUNT * 3)

    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i * 3] = (rand() - 0.5) * 20
      arr[i * 3 + 1] = (rand() - 0.5) * 20
      arr[i * 3 + 2] = (rand() - 0.5) * 20
    }

    return arr
  }, [])

  useFrame((_, delta) => {
    const points = pointsRef.current
    if (!points) return

    points.rotation.y += delta * 0.002
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={STAR_COUNT}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.25}
        depthWrite={false}
        color="#ffe6c7"
      />
    </points>
  )
}