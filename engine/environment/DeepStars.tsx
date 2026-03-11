"use client"

import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"

// Deep space background starfield (non-interactive)

const STAR_COUNT = 2000
const FIELD_RADIUS = 250
const SEED = 42

const generateStars = (count: number, radius: number, seed: number) => {
  const positions = new Float32Array(count * 3)
  let s = seed
  const random = () => {
    const x = Math.sin(s++) * 10000
    return x - Math.floor(x)
  }
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * random()
    const phi = Math.acos(2 * random() - 1)
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  return g
}

const StarLayer = ({ geometry, size, color }: any) => {
  const pointsRef = useRef<THREE.Points>(null)

  useFrame(({ camera }) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.x = camera.rotation.x * 0.05
    pointsRef.current.rotation.y = camera.rotation.y * 0.05
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        fog={false}
      />
    </points>
  )
}

export default function DeepStars() {
  const nearStars = useMemo(() => generateStars(60, 20, SEED), [])
  const midStars = useMemo(() => generateStars(200, 80, SEED), [])
  const farStars = useMemo(() => generateStars(400, 160, SEED), [])

  return (
    <group>
      <StarLayer geometry={nearStars} size={0.08} color="#444444" />
      <group scale={[2, 2, 2]}>
        <StarLayer geometry={midStars} size={0.05} color="#444444" />
      </group>
      <group scale={[4, 4, 4]}>
        <StarLayer geometry={farStars} size={0.03} color="#444444" />
      </group>
    </group>
  )
}