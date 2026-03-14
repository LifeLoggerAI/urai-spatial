"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense, useRef } from "react"

import Starfield from "../space/Starfield"
import MemorySphere from "../memory/MemorySphere"
import CameraRig from "../camera/CameraRig"
import { InteractionController } from "../core/InteractionController"

export default function EngineSpine(){

  const container = useRef<HTMLDivElement>(null!)

  return(

    <div
      ref={container}
      style={{
        width:"100vw",
        height:"100vh",
        position:"relative",
        overflow:"hidden"
      }}
    >

      <Canvas
        camera={{position:[0,0,8],fov:60}}
        eventSource={container}
        eventPrefix="client"
        dpr={[1,2]}
        gl={{antialias:true}}
      >

        <color attach="background" args={["black"]} />

        <ambientLight intensity={1.2} />

        <Suspense fallback={null}>
          <Starfield />
          <MemorySphere />
        </Suspense>

        <CameraRig />
        <InteractionController />

      </Canvas>

    </div>

  )

}