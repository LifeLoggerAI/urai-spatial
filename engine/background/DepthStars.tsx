"use client"

import { useMemo } from "react"
import * as THREE from "three"

function createLayer(
  count:number,
  radius:number,
  size:number,
  opacity:number
){

  const positions = new Float32Array(count * 3)

  for(let i=0;i<count;i++){

    /* uniform spherical distribution */

    const u = Math.random()
    const v = Math.random()

    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)

    const r = Math.cbrt(Math.random()) * radius

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    const i3 = i * 3

    positions[i3]   = x
    positions[i3+1] = y
    positions[i3+2] = z
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions,3)
  )

  const material = new THREE.PointsMaterial({

    size: size,
    color: "#dfe6ff",

    transparent: true,
    opacity: opacity,

    depthWrite: false,
    depthTest: true,

    blending: THREE.NormalBlending

  })

  const points = new THREE.Points(geometry, material)

  /* prevents stars disappearing during camera motion */
  points.frustumCulled = false

  return points
}

export default function DepthStars(){

  const group = useMemo(()=>{

    const g = new THREE.Group()

    g.add(createLayer(2000,800,1.2,0.35))
    g.add(createLayer(3000,1200,0.9,0.28))
    g.add(createLayer(5000,1800,0.7,0.22))

    return g

  },[])

  return <primitive object={group} />

}