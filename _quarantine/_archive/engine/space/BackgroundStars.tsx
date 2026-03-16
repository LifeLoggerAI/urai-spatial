"use client"

import { useMemo, useEffect } from "react"
import * as THREE from "three"

const STAR_COUNT = 2000

function seededRandom(seed:number){
  let t = seed += 0x6D2B79F5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export default function BackgroundStars(){

  const geometry = useMemo(()=>{

    const positions = new Float32Array(STAR_COUNT * 3)

    for(let i=0;i<STAR_COUNT;i++){

      const rx = seededRandom(i * 3)
      const ry = seededRandom(i * 3 + 1)
      const rz = seededRandom(i * 3 + 2)

      const x = (rx - 0.5) * 140
      const y = (ry - 0.5) * 140
      const z = -20 - rz * 120

      const i3 = i * 3

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    return geo

  },[])

  useEffect(()=>{
    return ()=>{
      geometry.dispose()
    }
  },[geometry])

  const material = useMemo(()=>{
    return new THREE.PointsMaterial({
      size:1.6,
      sizeAttenuation:true,
      color:"#cfd8ff",
      transparent:true,
      opacity:0.9,
      depthWrite:false
    })
  },[])

  return(

    <points geometry={geometry} material={material} />

  )

}