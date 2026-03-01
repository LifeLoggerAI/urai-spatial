'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import World from '../ecs/World'
import MainScene from '../scene/MainScene'
import * as THREE from 'three'

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
        camera={{ position: [0, 6, 14], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1
        }}
      >
        <color attach="background" args={['#0b1020']} />
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