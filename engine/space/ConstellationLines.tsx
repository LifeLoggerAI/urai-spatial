"use client"

import { useMemo } from "react"
import * as THREE from "three"

type Star = {
  position:[number,number,number]
}

export default function ConstellationLines({stars}:{stars:Star[]}){

  const geometry = useMemo(()=>{

    const segments:number[] = []

    for(let i=0;i<stars.length;i++){

      const a = stars[i].position

      for(let j=i+1;j<stars.length;j++){

        const b = stars[j].position

        const dx = a[0]-b[0]
        const dy = a[1]-b[1]
        const dz = a[2]-b[2]

        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)

        if(dist < 1.6){

          segments.push(a[0],a[1],a[2])
          segments.push(b[0],b[1],b[2])

        }

      }
    }

    const positions = new Float32Array(segments)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    return geo

  },[stars])

  return(

    <lineSegments geometry={geometry}>

      <lineBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.35}
        depthWrite={false}
      />

    </lineSegments>

  )

}