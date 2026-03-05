"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { useEffect } from "react"
import Starfield from "./Starfield"
import MemorySphere from "../../engine/spine/MemorySphere"
import useCameraGlide from "../../engine/spine/useCameraGlide"

function SceneCore(){

  const { camera } = useThree()

  useCameraGlide(camera)

  useEffect(()=>{
    camera.position.set(0,0,10)
  },[camera])

  return (
    <>
      <Starfield />
      <MemorySphere />
    </>
  )
}

export default function HomeScene(){
  return (
    <Canvas>
      <SceneCore />
    </Canvas>
  )
}
