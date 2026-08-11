'use client'

import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, type ReactNode } from 'react'
import RealWorldModel from '@/spatial/assets/RealWorldModel'

type PhysicalRealmStageProps = {
  modelSrc: string
  ariaLabel: string
  background?: string
  fog?: string
  cameraPosition?: [number, number, number]
  target?: [number, number, number]
  environmentPreset?: 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse'
  children?: ReactNode
  overlay?: ReactNode
  testId?: string
}

export default function PhysicalRealmStage({
  modelSrc,
  ariaLabel,
  background = '#111418',
  fog = '#24282b',
  cameraPosition = [0, 1.68, 7.4],
  target = [0, 1.35, 0],
  environmentPreset = 'apartment',
  children,
  overlay,
  testId = 'urai-physical-realm-stage',
}: PhysicalRealmStageProps) {
  return (
    <main
      data-testid={testId}
      data-spatial-owner="real-world-glb-stage"
      aria-label={ariaLabel}
      style={{ position: 'fixed', inset: 0, minHeight: '100svh', overflow: 'hidden', background }}
    >
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: cameraPosition, fov: 42, near: 0.08, far: 120 }}>
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[fog, 12, 38]} />
        <ambientLight intensity={0.45} color="#e8ece8" />
        <hemisphereLight intensity={0.62} color="#e4eef2" groundColor="#625d55" />
        <directionalLight
          castShadow
          position={[-4.5, 8.5, 4.2]}
          intensity={2.15}
          color="#f2f4ee"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[4, 4.5, -3]} intensity={0.52} color="#ffdcb3" />
        <Suspense fallback={null}>
          <RealWorldModel src={modelSrc} />
          {children}
          <Environment preset={environmentPreset} environmentIntensity={0.24} />
        </Suspense>
        <OrbitControls
          target={target}
          enablePan
          enableZoom
          minDistance={2.2}
          maxDistance={16}
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.53}
          makeDefault
        />
      </Canvas>
      {overlay}
    </main>
  )
}
