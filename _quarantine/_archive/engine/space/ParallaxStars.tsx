"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

function seededRandom(seed:number){
  let t = seed += 0x6D2B79F5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function createLayer(count:number, depth:number, seedOffset:number){

  const positions = new Float32Array(count * 3)

  for(let i=0;i<count;i++){

    const rx = seededRandom(i*3 + seedOffset)
    const ry = seededRandom(i*3 + seedOffset + 1)
    const rz = seededRandom(i*3 + seedOffset + 2)

    const i3 = i * 3

    positions[i3]     = (rx - 0.5) * 200
    positions[i3 + 1] = (ry - 0.5) * 200
    positions[i3 + 2] = -depth - rz * 120

  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(positions,3)
  )

  return geo
}

export default function ParallaxStars(){

  const layer1 = useRef<THREE.Points>(null!)
  const layer2 = useRef<THREE.Points>(null!)
  const layer3 = useRef<THREE.Points>(null!)

  const geo1 = useMemo(()=>createLayer(800,20,0),[])
  const geo2 = useMemo(()=>createLayer(700,60,2000),[])
  const geo3 = useMemo(()=>createLayer(600,120,4000),[])

  const mat1 = useMemo(()=>new THREE.PointsMaterial({
    size:0.7,
    color:"#7fa8ff",
    transparent:true,
    opacity:0.6,
    depthWrite:false,
    sizeAttenuation:true
  }),[])

  const mat2 = useMemo(()=>new THREE.PointsMaterial({
    size:0.9,
    color:"#9bbcff",
    transparent:true,
    opacity:0.5,
    depthWrite:false,
    sizeAttenuation:true
  }),[])

  const mat3 = useMemo(()=>new THREE.PointsMaterial({
    size:1.1,
    color:"#c8dcff",
    transparent:true,
    opacity:0.4,
    depthWrite:false,
    sizeAttenuation:true
  }),[])

  useFrame(({clock})=>{

    const t = clock.elapsedTime

    mat1.opacity = 0.6 + Math.sin(t*2)*0.2
    mat2.opacity = 0.5 + Math.sin(t*1.6)*0.25
    mat3.opacity = 0.4 + Math.sin(t*1.2)*0.25

  })

  useEffect(()=>{
    return ()=>{
      geo1.dispose()
      geo2.dispose()
      geo3.dispose()
      mat1.dispose()
      mat2.dispose()
      mat3.dispose()
    }
  },[geo1,geo2,geo3,mat1,mat2,mat3])

  return(

    <group>

      <points ref={layer1} geometry={geo1} material={mat1} />

      <points ref={layer2} geometry={geo2} material={mat2} />

      <points ref={layer3} geometry={geo3} material={mat3} />

    </group>

  )

}