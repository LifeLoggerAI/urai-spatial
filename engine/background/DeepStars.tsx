"use client"

import { useMemo } from "react"
import * as THREE from "three"

const STAR_COUNT = 9000
const RADIUS = 2000

export default function DeepStars(){

  const { geometry, material } = useMemo(()=>{

    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)

    const color = new THREE.Color()

    for(let i = 0; i < STAR_COUNT; i++){

      const r = RADIUS + Math.random() * 1000

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      const i3 = i * 3

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      const brightness =
        0.35 + Math.random() * 0.35

      const temp = Math.random()

      if(temp < 0.2)
        color.setRGB(brightness*0.8, brightness*0.9, brightness)
      else if(temp < 0.7)
        color.setRGB(brightness, brightness, brightness*0.9)
      else
        color.setRGB(brightness, brightness*0.85, brightness*0.7)

      colors[i3] = color.r
      colors[i3+1] = color.g
      colors[i3+2] = color.b

    }

    const geo = new THREE.BufferGeometry()

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions,3)
    )

    geo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors,3)
    )

    const mat = new THREE.PointsMaterial({

      size:0.85,
      vertexColors:true,
      transparent:true,

      /* softer star brightness */
      opacity:0.35,

      depthWrite:false,
      depthTest:true,

      /* prevent additive brightness stacking */
      blending:THREE.NormalBlending

    })

    return { geometry: geo, material: mat }

  },[])

  return(

    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />

  )

}