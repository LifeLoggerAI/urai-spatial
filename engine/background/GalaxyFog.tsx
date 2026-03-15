"use client"

import * as THREE from "three"
import { useMemo } from "react"

export default function GalaxyFog(){

  const material = useMemo(() => {

    return new THREE.MeshBasicMaterial({
      color: "#0b1026",
      transparent: true,
      opacity: 0.035,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    })

  }, [])

  return (

    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, -120, 0]}
      material={material}
    >

      <circleGeometry args={[1400, 64]} />

    </mesh>

  )

}