"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import LifeMapScene from "./LifeMapScene"

export default function LifeMapCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60 }}
      gl={{ antialias: true }}
    >
      <Suspense fallback={null}>
        <LifeMapScene />
      </Suspense>
    </Canvas>
  )
}
