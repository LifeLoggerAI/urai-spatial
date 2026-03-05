"use client"

import { Canvas } from "@react-three/fiber"
import { useState } from "react"

import Starfield from "./Starfield"
import MemorySphere from "./MemorySphere"
import MemoryImage from "./MemoryImage"

export default function SpineScene() {

  const [target, setTarget] = useState(null)

  return (
    <Canvas camera={{ position:[0,0,12], fov:60 }}>

      <ambientLight intensity={0.4} />

      <Starfield setTarget={setTarget} />

      <MemorySphere position={target} />

      <MemoryImage position={target} />

    </Canvas>
  )
}
