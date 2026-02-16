'use client'

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"

export default function XRCanvas() {
  return (
    <div className="w-screen h-screen bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 2]} />
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  )
}
