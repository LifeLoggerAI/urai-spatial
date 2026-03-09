"use client"

import { Canvas } from "@react-three/fiber"
import Starfield from "@/engine/scene/Starfield"
import CameraRig from "@/engine/camera/CameraRig"
import MemorySphere from "@/engine/memory/MemorySphere"

export default function SceneRoot(){

  return (
    <Canvas camera={{ position:[0,0,10], fov:50 }}>

      <ambientLight intensity={0.4} />

      <CameraRig />

      <Starfield />

      <MemorySphere />

    </Canvas>

  )

}
