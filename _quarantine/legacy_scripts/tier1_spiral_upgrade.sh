#!/usr/bin/env bash
set -e

echo "URAI SPATIAL — spiral starfield upgrade"

pkill -f next || true

rm -rf .next

mkdir -p engine/core
mkdir -p engine/space

cat <<'GEN' > engine/core/spiralGalaxy.ts
import * as THREE from "three"

export function spiralGalaxy(seed:number,count:number){

  const stars:any[] = []
  const arms = 4
  const radius = 520

  function rand(n:number){
    const x = Math.sin(n*999.91+seed)*43758.5453
    return x-Math.floor(x)
  }

  for(let i=0;i<count;i++){

    const arm = i % arms
    const t = i/count

    const angle = t*Math.PI*10 + arm*Math.PI*2/arms
    const r = Math.pow(rand(i),0.7)*radius

    const x = Math.cos(angle)*r + (rand(i+2)-0.5)*25
    const z = Math.sin(angle)*r + (rand(i+4)-0.5)*25
    const y = (rand(i+6)-0.5)*60

    stars.push({id:i,position:[x,y,z]})
  }

  return stars
}
GEN


cat <<'STAR' > engine/space/Starfield.tsx
"use client"

import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { spiralGalaxy } from "../core/spiralGalaxy"

const STAR_COUNT = 12000

export default function Starfield(){

  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const selectStar = useSpatialStore(s=>s.selectStar)

  const stars = useMemo(()=>{
    return spiralGalaxy(42,STAR_COUNT)
  },[])

  useEffect(()=>{

    if(!meshRef.current) return

    const dummy = new THREE.Object3D()

    stars.forEach((star,i)=>{

      dummy.position.set(
        star.position[0],
        star.position[1],
        star.position[2]
      )

      const scale = Math.random()*0.6 + 0.3
      dummy.scale.set(scale,scale,scale)

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i,dummy.matrix)

    })

    meshRef.current.instanceMatrix.needsUpdate = true

  },[stars])

  const handleClick = (e:any)=>{
    e.stopPropagation()

    const id = e.instanceId
    const star = stars[id]

    selectStar(
      star.id,
      new THREE.Vector3(...star.position)
    )
  }

  return (

    <instancedMesh
      ref={meshRef}
      args={[undefined,undefined,STAR_COUNT]}
      onClick={handleClick}
    >

      <sphereGeometry args={[0.9,8,8]} />

      <meshBasicMaterial
        color="#ffffff"
      />

    </instancedMesh>

  )
}
STAR


echo "installing deps"
pnpm install

echo "starting dev"
pnpm dev

