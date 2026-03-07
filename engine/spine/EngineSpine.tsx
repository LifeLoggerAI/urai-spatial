"use client"

import { Canvas } from "@react-three/fiber"

import Environment from "@/engine/environment/Environment"
import Starfield from "@/engine/stars/Starfield"
import CameraRig from "@/engine/scene/CameraRig"
import MemorySphere from "@/engine/scene/MemorySphere"

export default function EngineSpine(){

  return(

    <Canvas camera={{ position:[0,0,8], fov:60 }}>

      <Environment />

      <Starfield />

      <CameraRig />

      <MemorySphere />

    </Canvas>

  )

}
