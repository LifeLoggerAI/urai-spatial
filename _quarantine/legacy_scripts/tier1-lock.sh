#!/usr/bin/env bash
set -e

echo "LOCKING URAI SPATIAL TIER-1"

mkdir -p engine/scene
mkdir -p engine/camera
mkdir -p engine/memory
mkdir -p engine/state

############################################
# STATE STORE
############################################

cat << 'STATE' > engine/state/spatialStore.ts
"use client"
import { create } from "zustand"

export const useSpatialStore = create((set)=>({

  selectedStarId: null,
  selectedPosition: null,
  replayMode: false,

  selectStar:(id,position)=>set({
    selectedStarId:id,
    selectedPosition:position,
    replayMode:false
  }),

  exitReplay:()=>set({
    selectedStarId:null,
    selectedPosition:null,
    replayMode:false
  }),

  enterReplay:()=>set({
    replayMode:true
  })

}))
STATE

############################################
# CAMERA RIG
############################################

cat << 'CAMERA' > engine/camera/CameraRig.tsx
"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import * as THREE from "three"

export default function CameraRig(){

  const { camera } = useThree()
  const pos = useSpatialStore(s=>s.selectedPosition)

  useFrame(()=>{

    if(!pos) return

    const target = new THREE.Vector3(pos[0],pos[1],pos[2]+2)

    camera.position.lerp(target,0.08)
    camera.lookAt(pos[0],pos[1],pos[2])

  })

  return null
}
CAMERA

############################################
# MEMORY SPHERE
############################################

cat << 'SPHERE' > engine/memory/MemorySphere.tsx
"use client"

import { useSpatialStore } from "../state/spatialStore"

export default function MemorySphere(){

  const pos = useSpatialStore(s=>s.selectedPosition)

  if(!pos) return null

  return (

    <group position={pos}>

      <mesh scale={[1.8,1.8,1.8]}>
        <sphereGeometry args={[1,32,32]} />
        <meshStandardMaterial
          transparent
          opacity={0.25}
          color="#88ccff"
        />
      </mesh>

      <mesh position={[0,0,0]}>
        <planeGeometry args={[1.2,1.2]} />
        <meshBasicMaterial
          map={null}
          color="white"
        />
      </mesh>

    </group>

  )
}
SPHERE

############################################
# STARFIELD
############################################

cat << 'STARS' > engine/scene/Starfield.tsx
"use client"

import { useMemo } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function Starfield(){

  const selectStar = useSpatialStore(s=>s.selectStar)
  const selected = useSpatialStore(s=>s.selectedStarId)

  const stars = useMemo(()=>{

    const arr=[]

    const cols=5
    const rows=4

    const spacingX=3
    const spacingY=2.5

    for(let x=0;x<cols;x++){
      for(let y=0;y<rows;y++){

        const id = x*rows+y

        const position=[
          (x-cols/2)*spacingX,
          (y-rows/2)*spacingY,
          -4
        ]

        arr.push({id,position})

      }
    }

    return arr

  },[])

  return(

    <group>

      {stars.map(s=>{

        const active = selected===s.id

        return(

          <mesh
            key={s.id}
            position={s.position}
            onPointerDown={()=>selectStar(s.id,s.position)}
          >

            <sphereGeometry args={[0.18,16,16]} />

            <meshStandardMaterial
              emissive={active ? "#ffffff":"#444444"}
              emissiveIntensity={active ? 4 : 0.6}
              color={active ? "#ffffff":"#aaaaaa"}
            />

          </mesh>

        )

      })}

    </group>

  )
}
STARS

############################################
# INSTALL DEPENDENCIES
############################################

pnpm add three @react-three/fiber zustand

echo "TIER 1 ENGINE FILES INSTALLED"

echo "START SERVER WITH:"
echo "pnpm dev"

