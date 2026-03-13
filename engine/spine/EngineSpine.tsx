"use client"

import { Canvas } from "@react-three/fiber"
import { useRef } from "react"

import Starfield from "../scene/Starfield"
import MemorySphere from "../scene/MemorySphere"
import CameraRig from "../camera/CameraRig"
import { InteractionController } from "../core/InteractionController"

export default function EngineSpine(){

  const container = useRef(null)

  return(

    <div
      ref={container}
      style={{
        width:"100vw",
        height:"100vh",
        position:"relative"
      }}
    >

      <Canvas
        camera={{position:[0,0,8],fov:60}}
        eventSource={container}
        eventPrefix="client"
      >

        <color attach="background" args={["black"]}/>
        <ambientLight intensity={1.2}/>

        <Starfield />
        <MemorySphere />
        <CameraRig />
        <InteractionController />

      </Canvas>

    </div>

  )

}
