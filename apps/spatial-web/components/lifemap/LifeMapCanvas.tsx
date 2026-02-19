'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import {
  Suspense,
  useRef,
  useState,
  useEffect,
} from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { useRouter } from 'next/navigation'

// Import scene elements from the new lifemap directory
import Starfield from './Starfield'
import LifeOrb from './LifeOrb'
import Ground from './Ground'
import ProceduralNebula from './ProceduralNebula'

export default function LifeMapCanvas() {
  const [entering, setEntering] = useState(false)
  const mouse = useRef({ x: 0, y: 0 })
  const router = useRouter()

  // The main scene is defined as a component within the canvas
  function Scene() {
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2
        mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    useFrame(({ camera }) => {
      // Mouse Parallax Warp
      camera.position.x += (mouse.current.x * 0.5 - camera.position.x) * 0.05
      camera.position.y += (-mouse.current.y * 0.3 - camera.position.y) * 0.05

      // Enter-Life-Map Warp Transition
      if (entering) {
        camera.position.z -= 0.15
        if (camera.position.z < -20) {
          // Stop the zoom and potentially navigate
          setEntering(false) // Prevent continuous zoom
          // router.push('/some-other-place') // Example navigation
        }
      }
    })

    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <Suspense fallback={null}>
          <ProceduralNebula />
          <Starfield />
          <LifeOrb />
          <Ground />
        </Suspense>

        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.2} />
          <DepthOfField focusDistance={0.02} focalLength={0.02} bokehScale={3} />
        </EffectComposer>
      </>
    )
  }

  return (
    <div
      onClick={() => setEntering(true)}
      style={{ width: '100vw', height: '100vh', background: 'black', cursor: 'pointer' }}
    >
      <Canvas gl={{ antialias: true }}>
        <Scene />
      </Canvas>
    </div>
  )
}
