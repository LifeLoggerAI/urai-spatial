"use client"

import { useMemo } from "react"
import * as THREE from "three"

const STAR_COUNT = 1200
const WORLD_SIZE = 120

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function Starfield() {
  const geometry = useMemo(() => {
    const rand = mulberry32(42)
    const positions = new Float32Array(STAR_COUNT * 3)

    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3 + 0] = (rand() - 0.5) * WORLD_SIZE
      positions[i * 3 + 1] = rand() * WORLD_SIZE * 0.8
      positions[i * 3 + 2] = (rand() - 0.5) * WORLD_SIZE
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.6,
        sizeAttenuation: true,
      }),
    []
  )

  return <points geometry={geometry} material={material} />
}
