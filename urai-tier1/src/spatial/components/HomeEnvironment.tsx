"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function HomeEnvironment({ visible = true }: { visible?: boolean }) {
  const root = useRef<THREE.Group>(null)
  const orb = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (orb.current) {
      orb.current.position.y = 0.55 + Math.sin(t * 0.5) * 0.04
    }
  })

  if (!visible) return null

  return (
    <group ref={root}>
      <fog attach="fog" args={["#070c14", 8, 36]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />
      <pointLight position={[0, 0.6, -4]} intensity={2} />

      <mesh position={[0, 8, -18]}>
        <sphereGeometry args={[20, 32, 32]} />
        <meshBasicMaterial color="#0b1626" side={THREE.BackSide} />
      </mesh>

      <mesh position={[0, 0.4, -10]} rotation={[-Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[4, 14, 64]} />
        <meshBasicMaterial color="#3a557a" transparent opacity={0.25} />
      </mesh>

      <mesh position={[0, -0.6, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a2430" roughness={0.95} metalness={0.05} />
      </mesh>

      <mesh ref={orb} position={[0, 0.55, -4]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#9ec3ff" emissiveIntensity={1.1} />
      </mesh>
    </group>
  )
}
