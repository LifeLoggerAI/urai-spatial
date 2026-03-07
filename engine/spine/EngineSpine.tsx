"use client"

import { Canvas } from "@react-three/fiber"

import Starfield from "../stars/Starfield"
import MemorySphere from "../scene/MemorySphere"
import CameraRig from "../scene/CameraRig"

export default function EngineSpine(){

  return(
    <Canvas camera={{position:[0,0,35],fov:60}}>
      <color attach="background" args={["black"]}/>
      <ambientLight intensity={1.2}/>

      <CameraRig/>

      <Starfield/>

      <MemorySphere/>

    </Canvas>
  )
}
