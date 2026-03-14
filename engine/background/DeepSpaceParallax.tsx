"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function DeepSpaceParallax(){

  const geometry = useMemo(()=>{

    const COUNT = 3000
    const RANGE = 2400

    const positions = new Float32Array(COUNT * 3)

    for(let i=0;i<COUNT;i++){

      const i3 = i * 3

      positions[i3]     = (Math.random()-0.5) * RANGE
      positions[i3 + 1] = (Math.random()-0.5) * RANGE
      positions[i3 + 2] = (Math.random()-0.5) * RANGE

    }

    const g = new THREE.BufferGeometry()

    g.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    return g

  },[])

  const material = useMemo(()=>{

    return new THREE.PointsMaterial({

      color:"#dfe6ff",

      /* smaller background stars */
      size:0.55,

      transparent:true,

      /* softer brightness */
      opacity:0.35,

      depthWrite:false,
      depthTest:true,

      blending:THREE.NormalBlending

    })

  },[])

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  )

}