"use client"

import { Canvas } from "@react-three/fiber"
import Starfield from "./Starfield"
import CameraRig from "./CameraRig"

export default function EngineSpine(){

  return(

    <Canvas
      camera={{position:[0,0,300],fov:60}}
    >

      <CameraRig />
      <Starfield />

    </Canvas>

  )

}
