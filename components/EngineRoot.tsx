"use client"

import { Canvas } from "@react-three/fiber"
import { useState } from "react"
import HomeScene from "./home/HomeScene"
import LifeMapScene from "./lifemap/LifeMapScene"

export default function EngineRoot() {
  const [mode, setMode] = useState<"home" | "lifemap">("home")

  return (
    <Canvas
      camera={{ position: [0, 5, 20], fov: 60 }}
      style={{ position: "fixed", inset: 0 }}
    >
      {mode === "home" && (
        <HomeScene
          onSkyClick={() => setMode("lifemap")}
          onOrbClick={() => alert("Open Chat UI")}
          onGroundClick={() => alert("Ground Zoom")}
        />
      )}

      {mode === "lifemap" && <LifeMapScene />}
    </Canvas>
  )
}
