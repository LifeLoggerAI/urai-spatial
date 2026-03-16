"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

export default function NebulaVolume() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  useFrame((state) => {
    if (!meshRef.current) return
    const camFactor = camera.position.z / 300
    meshRef.current.material.opacity = 0.15 + camFactor * 0.25
    meshRef.current.rotation.y += 0.001 + camFactor * 0.003
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[500, 32, 32]} />
      <meshStandardMaterial color="#4c3b7f" transparent opacity={0.15} side={THREE.BackSide} />
    </mesh>
  )
}
