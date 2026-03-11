"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function ConstellationLines({stars}:{stars:any[]}){

  const geometry = useMemo(()=>{

    const verts:number[] = []

    for(let i=0;i<stars.length;i++){
      for(let j=i+1;j<stars.length;j++){

        const a = stars[i].position
        const b = stars[j].position

        const dx = a[0]-b[0]
        const dy = a[1]-b[1]
        const dist = Math.sqrt(dx*dx+dy*dy)

        if(dist < 1.5){

          verts.push(a[0],a[1],a[2])
          verts.push(b[0],b[1],b[2])

        }

      }
    }

    const g = new THREE.BufferGeometry()

    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(verts,3)
    )

    return g

  },[stars])

  return(
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.3}
      />
    </lineSegments>
  )
}
