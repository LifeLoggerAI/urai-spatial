'use client'

import { Stars } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function EnvironmentUpgrades() {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = null
  }, [scene])

  return (
    <>
      {/* Deep Space Stars */}
      <Stars
        radius={100}
        depth={60}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Soft Ambient Light */}
      <ambientLight intensity={0.6} />

      {/* Directional Rim Light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        color="#cfe9ff"
      />

      {/* Subtle Ground Bounce */}
      <directionalLight
        position={[0, -5, 2]}
        intensity={0.3}
        color="#1e2a4a"
      />
    </>
  )
}
