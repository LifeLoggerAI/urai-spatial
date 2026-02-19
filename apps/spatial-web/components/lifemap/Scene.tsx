/* eslint-disable react/no-unknown-property */
'use client'

import { useFrame } from '@react-three/fiber'
import {
  Suspense,
  useRef,
  useState,
} from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { Vector2, Mesh, MathUtils } from 'three'

// Import scene elements. Note: paths will be updated after file moves
import Stars from '../scene/Stars'
import Orb from '../scene/Orb'
import Ground from '../scene/Ground'
import ProceduralNebula from '../scene/ProceduralNebula'
import BloomEffects from './BloomEffects'

export default function Scene() {
  // State and refs will be moved to a hook later
  const [zooming, setZooming] = useState(false)
  const mousePos = useRef(new Vector2())
  const orbRef = useRef<Mesh>(null!)

  useFrame(({ camera, clock, mouse }) => {
    const t = clock.getElapsedTime()
    mousePos.current.lerp(mouse, 0.05)

    if (zooming) {
      // This will be triggered by the parent canvas
      camera.position.z = MathUtils.lerp(camera.position.z, 0.8, 0.025)
      camera.fov = MathUtils.lerp(camera.fov, 100, 0.025)
      camera.updateProjectionMatrix()
    } else {
      const targetX = Math.sin(t * 0.1) * 0.2 + mousePos.current.x * 0.1
      const targetY = Math.cos(t * 0.1) * 0.1 + mousePos.current.y * 0.1
      
      camera.position.x = MathUtils.lerp(camera.position.x, targetX, 0.05)
      camera.position.y = MathUtils.lerp(camera.position.y, targetY, 0.05)
      
      camera.position.z = MathUtils.lerp(camera.position.z, 6, 0.05)
      camera.fov = MathUtils.lerp(camera.fov, 75, 0.05)
      camera.updateProjectionMatrix()
    }
    camera.lookAt(0, 0, 0)
  })
  
  return (
    <>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={75} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <Suspense fallback={null}>
          <ProceduralNebula />
          <Stars /> 
          <Orb ref={orbRef} />
          <Ground />
        </Suspense>

        <BloomEffects orbRef={orbRef} />
    </>
  )
}
