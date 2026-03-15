"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function Ground() {

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(2000, 2000, 1, 1)
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#04050a",
      side: THREE.DoubleSide
    })
  }, [])

  return (

    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.6, 0]}
      frustumCulled={false}
    />

  )

}