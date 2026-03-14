"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function Orb() {

  const sphereGeometry = useMemo(
    () => new THREE.SphereGeometry(1.6, 48, 48),
    []
  )

  const glowGeometry = useMemo(
    () => new THREE.CircleGeometry(1.8, 32),
    []
  )

  return (

    <group
      position={[0, -3.6, -4]}
      frustumCulled={false}
    >

      <mesh geometry={sphereGeometry}>

        <meshStandardMaterial
          color="#cfd9ff"
          emissive="#6e8cff"
          emissiveIntensity={2.4}
          roughness={0.15}
          metalness={0}
        />

      </mesh>

      <mesh
        geometry={glowGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.59, 0]}
      >

        <meshBasicMaterial
          color="#6e8cff"
          transparent
          opacity={0.2}
          depthWrite={false}
        />

      </mesh>

    </group>

  )

}