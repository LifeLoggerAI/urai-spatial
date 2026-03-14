"use client"

import { useMemo } from "react"
import * as THREE from "three"

const COUNT = 6000
const RADIUS = 1200

export default function HaloStars(){

  const points = useMemo(()=>{

    const positions = new Float32Array(COUNT*3)

    for(let i=0;i<COUNT;i++){

      const r = Math.random()*RADIUS
      const theta = Math.random()*Math.PI*2
      const phi = Math.acos((Math.random()*2)-1)

      const x = r*Math.sin(phi)*Math.cos(theta)
      const y = r*Math.sin(phi)*Math.sin(theta)
      const z = r*Math.cos(phi)

      const i3 = i*3

      positions[i3] = x
      positions[i3+1] = y
      positions[i3+2] = z

    }

    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    const sprite = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/sprites/disc.png"
    )

    const material = new THREE.PointsMaterial({

      map:sprite,
      size:0.5,
      transparent:true,

      /* reduce brightness */
      opacity:0.18,

      depthWrite:false,

      /* prevent glow stacking */
      blending:THREE.NormalBlending,

      color:"#aab6ff"

    })

    return new THREE.Points(geometry,material)

  },[])

  return <primitive object={points} />

}