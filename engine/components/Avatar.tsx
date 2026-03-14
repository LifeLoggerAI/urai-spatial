"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function Avatar() {

  const bodyGeometry = useMemo(
    () => new THREE.CapsuleGeometry(0.75, 3.6, 8, 16),
    []
  )

  const headGeometry = useMemo(
    () => new THREE.SphereGeometry(0.85, 32, 32),
    []
  )

  return (

    <group
      position={[2.4, -3.0, -1.2]}
      rotation={[0, -0.5, 0]}
      frustumCulled={false}
    >

      <mesh
        position={[0, 2.0, 0]}
        geometry={bodyGeometry}
      >

        <meshStandardMaterial
          color="#05060a"
          roughness={1}
          metalness={0}
        />

      </mesh>

      <mesh
        position={[0, 4.0, 0]}
        geometry={headGeometry}
      >

        <meshStandardMaterial
          color="#1a1c22"
          roughness={0.9}
          metalness={0}
        />

      </mesh>

    </group>

  )

}