#!/bin/bash
set -e

echo "---- URAI SPATIAL TIER1 INSTALL ----"

# kill stuck dev servers
pkill -f next || true

echo "cleaning caches"
rm -rf .next
rm -rf node_modules

echo "installing deps"
pnpm install

echo "creating galaxy generator"

mkdir -p engine/core

cat <<'GEN' > engine/core/generateGalaxy.ts
import * as THREE from "three"

export function generateGalaxy(seed:number,count:number){

  const stars:any[] = []

  const arms = 4
  const radius = 500

  for(let i=0;i<count;i++){

    const arm = i % arms
    const angle = (i/count)*Math.PI*8 + arm*Math.PI*2/arms

    const r = Math.pow(Math.random(),0.6)*radius

    const x = Math.cos(angle)*r + (Math.random()-0.5)*20
    const z = Math.sin(angle)*r + (Math.random()-0.5)*20
    const y = (Math.random()-0.5)*40

    stars.push({
      id:i,
      position:[x,y,z]
    })
  }

  return stars
}
GEN


echo "installing starfield"

mkdir -p engine/space

cat <<'STAR' > engine/space/Starfield.tsx
"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { generateGalaxy } from "../core/generateGalaxy"

export default function Starfield(){

  const setStar = useSpatialStore(s=>s.selectStar)

  const stars = useMemo(()=>{
    return generateGalaxy(42,12000)
  },[])

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(0.8,8,8)
  },[])

  const material = useMemo(()=>{
    return new THREE.MeshBasicMaterial({color:"#ffffff"})
  },[])

  return (
    <group>
      {stars.map(star => (
        <mesh
          key={star.id}
          geometry={geometry}
          material={material}
          position={star.position}
          onClick={()=>setStar(star.id,new THREE.Vector3(...star.position))}
        />
      ))}
    </group>
  )
}
STAR


echo "installing memory sphere"

mkdir -p engine/memory

cat <<'MEM' > engine/memory/MemorySphere.tsx
"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySphere(){

  const mesh = useRef<THREE.Mesh>(null!)

  const pos = useSpatialStore(s=>s.selectedStarPosition)

  useFrame(()=>{
    if(mesh.current){
      mesh.current.rotation.y += 0.01
    }
  })

  if(!pos) return null

  return (
    <mesh ref={mesh} position={pos}>
      <sphereGeometry args={[4,32,32]} />
      <meshStandardMaterial color="#4aa8ff" emissive="#4aa8ff" emissiveIntensity={1}/>
    </mesh>
  )
}
MEM


echo "updating scene controller"

mkdir -p engine/scene

cat <<'SCN' > engine/scene/SceneController.tsx
"use client"

import Starfield from "../space/Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"

export default function SceneController(){

  return (
    <>
      <CameraRig />
      <Starfield />
      <MemorySphere />
    </>
  )
}
SCN

echo "starting dev server"

pnpm dev

