"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense, useRef } from "react"

import Starfield from "../space/Starfield"
import MemorySphere from "../memory/MemorySphere"
import CameraRig from "../camera/CameraRig"
import { InteractionController } from "../core/InteractionController"

export default function EngineSpine(){

  const containerRef = useRef<HTMLDivElement>(null)

  return(

    <div
      ref={containerRef}
      style={{
        width:"100vw",
        height:"100vh",
        position:"relative",
        overflow:"hidden"
      }}
    >

      <Canvas
        camera={{ position:[0,0,8], fov:60 }}
        dpr={[1,2]}
        gl={{ antialias:true }}
        eventSource={containerRef}
        eventPrefix="client"
      >

        <color attach="background" args={["#000000"]} />

        <ambientLight intensity={1} />

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