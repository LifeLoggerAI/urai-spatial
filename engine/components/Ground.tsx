"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function Ground() {

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(200, 200),
    []
  )

  return (

    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.6, 0]}
      receiveShadow={false}
      castShadow={false}
      frustumCulled={false}
    >

      <meshStandardMaterial
        color="#05060a"
        roughness={1}
        metalness={0}
      />

    </mesh>

  )

}