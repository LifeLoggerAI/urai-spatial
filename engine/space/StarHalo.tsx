"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function StarHalo(){

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(0.45,24,24)
  },[])

  return(

    <mesh scale={[2.2,2.2,2.2]} geometry={geometry} renderOrder={2}>

      <meshBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.35}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />

    </mesh>

  )

}