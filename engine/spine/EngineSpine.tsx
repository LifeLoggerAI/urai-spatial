'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import World from '../ecs/World'
import MainScene from '../scene/MainScene'

export default function EngineSpine() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'black'
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 6, 12], fov: 50 }}
      >
        <World>
          <MainScene />
        </World>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={6}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 3, 0]}
        />
      </Canvas>
    </div>
  )
}