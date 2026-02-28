'use client'

import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'

export default function CanvasRoot({ children }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Simulate asset preloading
    setTimeout(() => {
      setReady(true)
    }, 400)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0f1f',
        opacity: ready ? 1 : 0,
        transition: 'opacity 400ms ease-in-out'
      }}
    >
      <Canvas shadows camera={{ position: [0, 6, 14], fov: 50 }}>
        <Preload all />
        {children}
      </Canvas>
    </div>
  )
}
