"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

import Starfield from "@/engine/scene/Starfield"
import CameraRig from "@/engine/camera/CameraRig"
import MemorySphere from "@/engine/memory/MemorySphere"

export default function SceneRoot(){

  return (

    <Canvas
      camera={{ position:[0,0,10], fov:50 }}
      gl={{ antialias:true }}
      dpr={[1,2]}
    >

      {/* background color */}
      <color attach="background" args={["#020412"]} />

      {/* depth fog for space atmosphere */}
      <fog attach="fog" args={["#020412", 40, 200]} />

      {/* base ambient lighting */}
      <ambientLight intensity={0.35} />

      <Suspense fallback={null}>

        <CameraRig />

        <Starfield />

        <MemorySphere />

      </Suspense>

      {/* bloom postprocessing for star glow */}
      <EffectComposer>

        <Bloom
          intensity={1.2}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          radius={0.7}
        />

      </EffectComposer>

    </Canvas>

  )

}