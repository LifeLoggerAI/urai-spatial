"use client"

import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function CoreGlow() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  useFrame(() => {
    if (!meshRef.current) return
    const camDist = camera.position.length()
    meshRef.current.scale.setScalar(1 + camDist / 500)
    meshRef.current.material.opacity = 0.2 + camDist / 1200
    meshRef.current.rotation.y += 0.002
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[20, 32, 32]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.2} emissive="#7a4fff" emissiveIntensity={0.5} />
    </mesh>
  )
}
