"use client"

import { Canvas } from "@react-three/fiber"

import Starfield from "./Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"
import ReplayController from "../replay/ReplayController"

export default function SpatialScene(){

  return(

    <Canvas
      camera={{ position:[0,0,6], fov:60 }}
      raycaster={{ params:{ Mesh:{} } }}
      onPointerMissed={()=>{}}
    >

      <ambientLight intensity={0.8} />

      <CameraRig />

      <Starfield />

      <MemorySphere />

      <ReplayController />

    </Canvas>

  )

}