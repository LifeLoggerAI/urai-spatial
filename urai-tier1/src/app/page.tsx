"use client"

import { Canvas } from "@react-three/fiber"
import Starfield from "@/engine/space/Starfield"
import CameraRig from "@/engine/camera/CameraRig"

export default function Page() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas camera={{ position: [0, 120, 240], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <CameraRig />
        <Starfield />
      </Canvas>
    </div>
  )
}