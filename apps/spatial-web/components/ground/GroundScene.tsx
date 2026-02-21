'use client'

import { Canvas } from '@react-three/fiber'

export default function GroundScene() {
  return (
    <Canvas camera={{ position: [0, 1.5, 5] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </Canvas>
  )
}
