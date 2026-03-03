'use client'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Starfield from '@/spatial/scene/Starfield'
import Ground from '@/spatial/scene/Ground'
import MemorySphere from '@/spatial/scene/MemorySphere'
import CameraRig from '@/spatial/components/CameraRig'
import { useSceneStore } from '@/spatial/state/sceneStore'

export default function Page() {
  const { setMode } = useSceneStore()

  return (
    <div className="w-screen h-screen bg-black">
      <Canvas
        camera={{ position: [0, 0, 100], fov: 50 }}
        onCreated={({ scene }) => {
          scene.fog = new THREE.FogExp2(0x000000, 0.02)
        }}
      >
        <ambientLight intensity={0.3} />
        <Starfield />
        <Ground />
        <MemorySphere />
        <CameraRig />
      </Canvas>

      <button
        onClick={() => setMode('lifemap')}
        className="absolute top-4 left-4 text-white"
      >
        Enter
      </button>
    </div>
  )
}
