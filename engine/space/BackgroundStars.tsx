"use client"

import { useMemo } from "react"
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

      const r = seededRandom(i)

      const x = (r - 0.5) * 140
      const y = (seededRandom(i+1) - 0.5) * 140
      const z = -20 - seededRandom(i+2) * 120

      positions[i*3] = x
      positions[i*3+1] = y
      positions[i*3+2] = z
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    return geo

  },[])

  return(

    <points geometry={geometry}>

      <pointsMaterial
        size={1.6}
        sizeAttenuation
        color="#cfd8ff"
        transparent
        opacity={0.9}
        depthWrite={false}
      />

    </points>

  )

}