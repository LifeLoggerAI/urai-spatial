"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"

export default function ReplayPage() {
  return (
    <div className="w-screen h-screen bg-black">
      <Canvas camera={{ position: [0, 1, 5] }}>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry args={[2, 1, 0.1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
