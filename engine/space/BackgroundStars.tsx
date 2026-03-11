"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function BackgroundStars(){

  const geometry = useMemo(()=>{

    const positions:number[] = []

    for(let i=0;i<2000;i++){

      const x = (Math.random()-0.5)*140
      const y = (Math.random()-0.5)*140
      const z = -20 - Math.random()*120

      positions.push(x,y,z)

    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions,3)
    )

    return geo

  },[])

  return(

    <points geometry={geometry}>

      <pointsMaterial
        size={1.6}
        color="#cfd8ff"
        transparent
        opacity={0.9}
        depthWrite={false}
      />

    </points>

  )

}
