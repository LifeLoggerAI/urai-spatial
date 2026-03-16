"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function Orb() {

  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)

  const sphereGeometry = useMemo(
    () => new THREE.SphereGeometry(1.6, 48, 48),
    []
  )

  const glowGeometry = useMemo(
    () => new THREE.CircleGeometry(2.0, 32),
    []
  )

  useFrame(({ clock }) => {

    const t = clock.elapsedTime

    if (groupRef.current) {
      groupRef.current.position.y = -3.6 + Math.sin(t * 1.2) * 0.08
    }

    if (matRef.current) {
      matRef.current.emissiveIntensity =
        2.2 + Math.sin(t * 2.2) * 0.25
    }

  })

  return (

    <group
      ref={groupRef}
      position={[0, -3.6, -4]}
      frustumCulled={false}
    >

      <mesh geometry={sphereGeometry}>

        <meshStandardMaterial
          ref={matRef}
          color="#cfd9ff"
          emissive="#6e8cff"
          emissiveIntensity={2.2}
          roughness={0.15}
          metalness={0}
        />

      </mesh>

      <mesh
        geometry={glowGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.7, 0]}
      >

        <meshBasicMaterial
          color="#6e8cff"
          transparent
          opacity={0.18}
          depthWrite={false}
        />

      </mesh>

    </group>

  )

}