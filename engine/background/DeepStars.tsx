"use client"

import { useMemo } from "react"
import * as THREE from "three"

const STAR_COUNT = 9000
const RADIUS = 8000

export default function DeepStars(){

  const { geometry, material } = useMemo(()=>{

    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)

    const color = new THREE.Color()

    for(let i = 0; i < STAR_COUNT; i++){

      const r = RADIUS + Math.random() * 2000

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      const i3 = i * 3

      positions[i3] = x
      positions[i3+1] = y
      positions[i3+2] = z

      const brightness =
        0.5 + Math.random() * 0.5

      color.setRGB(brightness, brightness, brightness)

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

      size:1.2,
      vertexColors:true,
      transparent:true,
      opacity:0.8,

      depthWrite:false,
      depthTest:true,

      fog:false,

      blending:THREE.AdditiveBlending

    })

    return { geometry: geo, material: mat }

  },[])

  return(

    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-5}
    />

  )

}