#!/bin/bash

echo "Creating camera rig..."

mkdir -p engine/camera

cat << 'CAM' > engine/camera/CameraRig.tsx
"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function CameraRig({ target }) {

  const { camera } = useThree()

  useFrame(() => {

    if (!target) return

    const desired = new THREE.Vector3(
      target[0],
      target[1],
      target[2] + 3
    )

    camera.position.lerp(desired, 0.08)

    camera.lookAt(
      target[0],
      target[1],
      target[2]
    )

  })

  return null
}
CAM

echo "Updating EngineSpine..."

cat << 'ENG' > engine/spine/EngineSpine.tsx
"use client"

import { Canvas } from "@react-three/fiber"
import { useState } from "react"

import Starfield from "../scene/Starfield"
import MemorySphere from "../scene/MemorySphere"
import CameraRig from "../camera/CameraRig"

export default function EngineSpine(){

  const [target,setTarget] = useState<[number,number,number] | null>(null)

  return(
    <Canvas camera={{position:[0,0,8],fov:60}}>

      <color attach="background" args={["black"]}/>
      <ambientLight intensity={1.2}/>

      <Starfield setTarget={setTarget} />

      {target && <MemorySphere position={target}/>}

      <CameraRig target={target}/>

    </Canvas>
  )
}
ENG

echo "Restarting dev server..."

pkill -f "next dev"

sleep 2

pnpm dev
