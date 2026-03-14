"use client"

import { useMemo } from "react"
import * as THREE from "three"

function createLayer(
  count:number,
  radius:number,
  size:number,
  opacity:number
){

  const positions = new Float32Array(count*3)

  for(let i=0;i<count;i++){

    const r = Math.random()*radius
    const theta = Math.random()*Math.PI*2
    const phi = Math.acos((Math.random()*2)-1)

    const x = r*Math.sin(phi)*Math.cos(theta)
    const y = r*Math.sin(phi)*Math.sin(theta)
    const z = r*Math.cos(phi)

    const i3 = i*3

    positions[i3]   = x
    positions[i3+1] = y
    positions[i3+2] = z
  }

  const geo = new THREE.BufferGeometry()

  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(positions,3)
  )

  const mat = new THREE.PointsMaterial({

    size:size,
    color:"#dfe6ff",

    transparent:true,

    /* softer stars */
    opacity:opacity,

    depthWrite:false,
    depthTest:true,

    blending:THREE.NormalBlending

  })

  const points = new THREE.Points(geo,mat)
  points.frustumCulled = false

  return points
}

export default function DepthStars(){

  const layers = useMemo(()=>{

    const group = new THREE.Group()

    group.add(createLayer(2000,800,1.2,0.35))
    group.add(createLayer(3000,1200,0.9,0.28))
    group.add(createLayer(5000,1800,0.7,0.22))

    return group

  },[])

  return <primitive object={layers} />

}