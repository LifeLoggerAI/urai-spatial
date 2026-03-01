'use client'

import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'

export default function CanvasRoot({ children }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true)
    }, 400)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#060c1a',
        opacity: ready ? 1 : 0,
        transition: 'opacity 500ms ease-in-out'
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [0, 8.5, 14],  // raised higher
          fov: 28,                 // tighter cinematic compression
          near: 0.1,
          far: 400
        }}
      >
        <Preload all />
        {children}
      </Canvas>
    </div>
  )
}