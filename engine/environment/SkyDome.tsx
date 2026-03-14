"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function SkyDome(){

  const geometry = useMemo(
    () => new THREE.SphereGeometry(1, 32, 32),
    []
  )

  return(

    <mesh
      geometry={geometry}
      scale={500}
      frustumCulled={false}
    >

      <meshBasicMaterial
        color="#05070d"
        side={THREE.BackSide}
        depthWrite={false}
      />

    </mesh>

  )

}