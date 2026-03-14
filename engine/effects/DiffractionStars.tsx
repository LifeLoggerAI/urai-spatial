"use client"

import * as THREE from "three"
import { useMemo } from "react"

export default function DiffractionStars(){

  const { geometry, material } = useMemo(()=>{

    const geo = new THREE.BufferGeometry()

    const SIZE = 12

    const positions = new Float32Array([

      -SIZE,0,0,
       SIZE,0,0,

      0,-SIZE,0,
      0, SIZE,0,

      -SIZE*0.7,-SIZE*0.7,0,
       SIZE*0.7, SIZE*0.7,0,

      -SIZE*0.7, SIZE*0.7,0,
       SIZE*0.7,-SIZE*0.7,0

    ])

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    const mat = new THREE.LineBasicMaterial({

      color:"#e6ecff",
      transparent:true,
      opacity:0.25,
      depthWrite:false

    })

    return { geometry:geo, material:mat }

  },[])

  return(

    <lineSegments
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />

  )

}