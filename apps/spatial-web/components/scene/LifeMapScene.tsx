/* eslint-disable react/no-unknown-property */
'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import {
  Suspense,
  useRef,
  useState,
}
from 'react'
import Stars from './Stars'
import Orb from './Orb'
import Ground from './Ground'
import { PerspectiveCamera } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  GodRays
} from '@react-three/postprocessing'
import ProceduralNebula from './ProceduralNebula' // Replaced Nebula
import { Vector2, Mesh, MathUtils } from 'three'
import { BlendFunction } from 'postprocessing'

export default function LifeMapScene() {
  const [zooming, setZooming] = useState(false)
  const mousePos = useRef(new Vector2())
  const orbRef = useRef<Mesh>(null!)

  useFrame(({ camera, clock, mouse }) => {
    const t = clock.getElapsedTime()
    mousePos.current.lerp(mouse, 0.05)

    if (zooming) {
      // Warp zoom effect
      camera.position.z = MathUtils.lerp(camera.position.z, 0.8, 0.025)
      camera.fov = MathUtils.lerp(camera.fov, 100, 0.025)
      camera.updateProjectionMatrix()
    } else {
      // Normal cinematic camera movement
      const targetX = Math.sin(t * 0.1) * 0.2 + mousePos.current.x * 0.1
      const targetY = Math.cos(t * 0.1) * 0.1 + mousePos.current.y * 0.1
      
      // Lerp camera position for smooth drift and parallax
      camera.position.x = MathUtils.lerp(camera.position.x, targetX, 0.05)
      camera.position.y = MathUtils.lerp(camera.position.y, targetY, 0.05)
      
      // Ensure it stays at the default zoom level if not zooming
      camera.position.z = MathUtils.lerp(camera.position.z, 6, 0.05)
      camera.fov = MathUtils.lerp(camera.fov, 75, 0.05)
      camera.updateProjectionMatrix()
    }
    camera.lookAt(0, 0, 0)
  })

  return (
    <div
      onClick={() => setZooming(true)}
      style={{ width: '100vw', height: '100vh', background: 'black' }}
    >
      <Canvas gl={{ antialias: false }}>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={75} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <Suspense fallback={null}>
          <ProceduralNebula />
          <Stars />
          <Orb ref={orbRef} />
          <Ground />
        </Suspense>

        {orbRef.current && (
        <EffectComposer>
          <GodRays
            sun={orbRef.current}
            blendFunction={BlendFunction.SCREEN}
            samples={60}
            density={0.97}
            decay={0.97}
            weight={0.6}
            exposure={0.4}
            clampMax={1}
          />
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            height={480}
          />
          <DepthOfField
            focusDistance={0}
            focalLength={0.02}
            bokehScale={2}
            height={480}
          />
        </EffectComposer>
         )}
      </Canvas>
    </div>
  )
}
