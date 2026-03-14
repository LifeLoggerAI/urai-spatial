"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function StarHalo(){

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(0.25,16,16)
  },[])

  return(

    <mesh scale={[1.8,1.8,1.8]} geometry={geometry}>

      <meshBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />

    </mesh>

  )

}