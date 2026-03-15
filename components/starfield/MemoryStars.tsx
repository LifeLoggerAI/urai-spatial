'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 2000

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function MemoryStars() {
  const pointsRef = useRef<THREE.Points>(null!)

  const geometry = useMemo(() => {
    const rng = mulberry32(1337)
    const positions = new Float32Array(STAR_COUNT * 3)

    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3] = (rng() - 0.5) * 10
      positions[i * 3 + 1] = (rng() - 0.5) * 10
      positions[i * 3 + 2] = (rng() - 0.5) * 10
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((_, delta) => {
    const points = pointsRef.current
    if (!points) return
    points.rotation.y += delta * 0.02
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.03}
        transparent
        opacity={0.25}
        depthWrite={false}
        color="#ffe6c7"
      />
    </points>
  )
}