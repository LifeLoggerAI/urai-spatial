'''"use client"

import { Canvas } from "@react-three/fiber"
import Starfield from "@/spatial/scene/Starfield"
import CameraRig from "@/spatial/components/CameraRig"
import { Suspense } from "react"
import { useSceneStore } from "@/spatial/state/sceneStore"
import MemorySphere from "@/spatial/scene/MemorySphere"

export default function SpatialScene() {
  const { mode, setMode } = useSceneStore();

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas camera={{ position: [0, 120, 240], fov: 60 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <CameraRig />
          <Starfield />
          <MemorySphere />
        </Suspense>
      </Canvas>
      <div style={{ position: "absolute", top: 20, left: 20, color: "white", zIndex: 100 }}>
        <h1>Current Mode: {mode}</h1>
        <button onClick={() => setMode("home")}>Home</button>
        <button onClick={() => setMode("lifemap")}>LifeMap</button>
      </div>
    </div>
  );
}
'''