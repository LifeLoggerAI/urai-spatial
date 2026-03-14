"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function VolumetricFog() {

  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {

    const mesh = meshRef.current
    if (!mesh) return

    mesh.rotation.y += 0.00025
    mesh.rotation.x += 0.0001

  })

  return (

    <mesh ref={meshRef} scale={[520,520,520]}>

      <sphereGeometry args={[1,64,64]} />

      <meshBasicMaterial
        color="#141a2a"
        transparent
        opacity={0.018}
        side={THREE.BackSide}
        depthWrite={false}
      />

    </mesh>

  )

}