"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function ConstellationLines({stars}:{stars:any[]}){

  const lines = useMemo(()=>{

    const segments:number[] = []

    for(let i=0;i<stars.length;i++){
      for(let j=i+1;j<stars.length;j++){

        const a = stars[i].position
        const b = stars[j].position

        const dx = a[0]-b[0]
        const dy = a[1]-b[1]
        const dist = Math.sqrt(dx*dx+dy*dy)

        if(dist < 1.6){

          segments.push(a[0],a[1],a[2])
          segments.push(b[0],b[1],b[2])

        }

      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(segments,3)
    )

    return geo

  },[stars])

  return(

    <lineSegments geometry={lines}>
      <lineBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.35}
      />
    </lineSegments>

  )

}
