"use client"

import { Canvas } from "@react-three/fiber"

import DeepStars from "../environment/DeepStars"
import SpaceAtmosphere from "../environment/SpaceAtmosphere"

import Starfield from "./Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "./MemorySphere"
import ReplayController from "../replay/ReplayController"

export default function SpatialScene(){

  return(

    <Canvas
      camera={{ position:[0,0,6], fov:60 }}
      raycaster={{ params:{ Mesh:{} } }}
      onPointerMissed={()=>{}}
    >

      <ambientLight intensity={0.8} />

      <DeepStars />
      <SpaceAtmosphere />

      <CameraRig />

      <Starfield />

      <MemorySphere />

      <ReplayController />

    </Canvas>

  )

}