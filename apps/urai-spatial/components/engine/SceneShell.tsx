"use client"

import { Canvas } from "@react-three/fiber"
import SceneRouter from "./SceneRouter"

export default function SceneShell({ scene }: { scene: string }) {
  return (
    <div className="w-screen h-screen">
      <Canvas
        shadows
        gl={{
          antialias: true,
          physicallyCorrectLights: true,
        }}
        camera={{ position: [0, 0, 3], fov: 45 }}
      >
        <SceneRouter scene={scene} />
      </Canvas>
    </div>
  )
}