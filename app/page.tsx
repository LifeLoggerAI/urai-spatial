'use client'

import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

import Starfield from '@/spatial/scene/Starfield'
import Ground from '@/spatial/scene/Ground'
import MemorySphere from '@/spatial/scene/MemorySphere'
import CameraRig from '@/spatial/components/CameraRig'
import SceneController from '@/spatial/core/SceneController'

import { useSceneStore } from '@/spatial/state/sceneStore'

export default function Page() {

  const { setMode } = useSceneStore()

  return (
    <div className="w-screen h-screen bg-black">

      <Canvas
        camera={{ position: [0, 0, 180], fov: 65 }}
        gl={{ antialias: true }}
        onCreated={({ scene }) => {

          /* remove fog to stop stars fading out */
          scene.fog = null

        }}
      >

        <color attach="background" args={['black']} />

        <ambientLight intensity={0.7} />

        <Starfield />
        <Ground />
        <MemorySphere />
        <CameraRig />
        <SceneController />

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