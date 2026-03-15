"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function GroundPlane(){

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(5000, 5000),
    []
  )

  return(

    <mesh
      geometry={geometry}
      rotation={[-Math.PI/2,0,0]}
      position={[0,-5,0]}
      receiveShadow={false}
      castShadow={false}
      frustumCulled={false}
    >

      <meshBasicMaterial
        color="#020406"
        depthWrite={false}
      />

    </mesh>

  )

}