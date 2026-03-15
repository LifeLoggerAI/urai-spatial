#!/bin/bash
set -e

echo "URAI SPATIAL TIER1 INSTALL"

pkill -f next || true

rm -rf .next

mkdir -p engine/core
mkdir -p engine/space
mkdir -p engine/memory
mkdir -p engine/scene

############################################
# spiral galaxy generator
############################################

cat <<'GEN' > engine/core/galaxy.ts
import * as THREE from "three"

export function createGalaxy(count:number){

  const stars:any[]=[]
  const arms=4
  const radius=520

  for(let i=0;i<count;i++){

    const arm=i%arms
    const t=i/count

    const angle=t*Math.PI*8 + arm*Math.PI*2/arms
    const r=Math.pow(Math.random(),0.7)*radius

    const x=Math.cos(angle)*r + (Math.random()-0.5)*20
    const z=Math.sin(angle)*r + (Math.random()-0.5)*20
    const y=(Math.random()-0.5)*40

    stars.push({id:i,position:[x,y,z]})
  }

  return stars
}
GEN

############################################
# starfield
############################################

cat <<'STAR' > engine/space/Starfield.tsx
"use client"

import {useMemo,useRef,useEffect} from "react"
import * as THREE from "three"
import {createGalaxy} from "../core/galaxy"
import {useSpatialStore} from "../state/spatialStore"

const STAR_COUNT=12000

export default function Starfield(){

  const mesh=useRef<THREE.InstancedMesh>(null!)
  const selectStar=useSpatialStore(s=>s.selectStar)

  const stars=useMemo(()=>{
    return createGalaxy(STAR_COUNT)
  },[])

  useEffect(()=>{

    if(!mesh.current) return

    const dummy=new THREE.Object3D()

    stars.forEach((star,i)=>{

      dummy.position.set(
        star.position[0],
        star.position[1],
        star.position[2]
      )

      const s=Math.random()*0.5+0.4
      dummy.scale.set(s,s,s)

      dummy.updateMatrix()
      mesh.current.setMatrixAt(i,dummy.matrix)

    })

    mesh.current.instanceMatrix.needsUpdate=true

  },[stars])

  const click=(e:any)=>{

    const id=e.instanceId
    const star=stars[id]

    selectStar(
      star.id,
      new THREE.Vector3(...star.position)
    )
  }

  return(

    <instancedMesh
      ref={mesh}
      args={[undefined,undefined,STAR_COUNT]}
      onClick={click}
    >

      <sphereGeometry args={[0.7,8,8]}/>
      <meshBasicMaterial color="#ffffff"/>

    </instancedMesh>

  )

}
STAR

############################################
# memory sphere
############################################

cat <<'MEM' > engine/memory/MemorySphere.tsx
"use client"

import {useRef} from "react"
import {useFrame} from "@react-three/fiber"
import * as THREE from "three"
import {useSpatialStore} from "../state/spatialStore"

export default function MemorySphere(){

  const mesh=useRef<THREE.Mesh>(null!)
  const pos=useSpatialStore(s=>s.selectedStarPosition)

  useFrame(()=>{
    if(mesh.current){
      mesh.current.rotation.y+=0.01
    }
  })

  if(!pos) return null

  return(
    <mesh ref={mesh} position={pos}>
      <sphereGeometry args={[4,32,32]}/>
      <meshStandardMaterial
        color="#4aa8ff"
        emissive="#4aa8ff"
        emissiveIntensity={1}
      />
    </mesh>
  )
}
MEM

############################################
# scene controller
############################################

cat <<'SCN' > engine/scene/SceneController.tsx
"use client"

import Starfield from "../space/Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"

export default function SceneController(){

  return(

    <>
      <CameraRig/>
      <Starfield/>
      <MemorySphere/>
    </>

  )

}
SCN

############################################

echo "install deps"
pnpm install

echo "start dev"
pnpm dev

