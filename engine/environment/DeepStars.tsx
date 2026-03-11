"use client"

import { useMemo } from "react"
import { Points, PointMaterial } from "@react-three/drei"
import * as THREE from "three"

export default function DeepStars(){

  const stars = useMemo(()=>{

    const count = 2000
    const positions = new Float32Array(count * 3)

    for(let i=0;i<count;i++){

      const r = 60

      positions[i*3+0] = (Math.random()-0.5) * r
      positions[i*3+1] = (Math.random()-0.5) * r
      positions[i*3+2] = -20 - Math.random()*40

    }

    return positions

  },[])

  return(

    <Points positions={stars} stride={3} frustumCulled={false}>

      <PointMaterial
        transparent
        color="#ffffff"
        size={0.08}
        sizeAttenuation
        depthWrite={false}
      />

    </Points>

  )

}
