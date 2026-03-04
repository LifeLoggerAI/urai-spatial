"use client"

import { Canvas } from "@react-three/fiber"
import Starfield from "./Starfield"

export default function EngineSpine() {
  return (
    <Canvas
      camera={{ position: [0, 0, 300], fov: 60 }}
      onPointerMissed={(e) => console.log("missed")}
    >
      <Starfield />
    </Canvas>
  )
}
