"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../../stores/spatialStore"

export default function MemorySphere(){

  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const geometry = useMemo(()=>new THREE.SphereGeometry(0.6,32,32),[])
  const material = useMemo(()=>new THREE.MeshBasicMaterial({
    color:"#66aaff",
    transparent:true,
    opacity:0.6
  }),[])

  if(!selectedStar) return null

  return(

    <mesh
      position={selectedStar.position}
      geometry={geometry}
      material={material}
    />

  )

}
