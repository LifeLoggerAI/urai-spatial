"use client"

import { Canvas } from "@react-three/fiber"

import Starfield from "./Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"
import MemoryContent from "../memory/MemoryContent"

export default function SceneRoot(){

  return (
    <div style={{width:"100vw",height:"100vh"}}>

      <Canvas camera={{position:[0,0,8],fov:50}}>

        <ambientLight intensity={1}/>

        <Starfield/>
        <CameraRig/>
        <MemorySphere/>
        <MemoryContent/>

      </Canvas>

    </div>
  )
}
