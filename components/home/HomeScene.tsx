"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function HomeScene({
  onSkyClick,
  onOrbClick,
  onGroundClick,
}: {
  onSkyClick: () => void
  onOrbClick: () => void
  onGroundClick: () => void
}) {
  const orbRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (orbRef.current) {
      orbRef.current.rotation.y += 0.005
    }
  })

  return (
    <>
      {/* SKY */}
      <mesh position={[0, 20, -50]} onClick={onSkyClick}>
        <sphereGeometry args={[100, 32, 32]} />
        <meshBasicMaterial color="#020412" side={THREE.BackSide} />
      </mesh>

      {/* GROUND */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -3, 0]}
        onClick={onGroundClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* ORB (BOTTOM CENTER) */}
      <mesh ref={orbRef} position={[0, -1.5, 0]} onClick={onOrbClick}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#9db7d5" />
      </mesh>

      {/* AVATAR BLOCK (placeholder) */}
      <mesh position={[-4, -1, 0]}>
        <boxGeometry args={[2, 4, 2]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </>
  )
}
