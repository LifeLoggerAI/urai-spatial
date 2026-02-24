'use client'

import { Canvas } from '@react-three/fiber'
import SceneManager from '@/components/SceneManager'
import { useQualityStore } from '@/engine/core/quality-store'

export default function CanvasRoot() {
  const setQuality = useQualityStore((state) => state.setQuality)

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
        camera={{ fov: 75 }}
        onCreated={({ gl }) => {
          const renderer = gl

          const maxTextures = renderer.capabilities.maxTextures
          const maxVertexUniforms = renderer.capabilities.maxVertexUniforms

          if (maxTextures < 16 || maxVertexUniforms < 1024) {
            setQuality('low')
          }

          gl.getContext().canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setQuality('low')
          })
        }}
      >
        <SceneManager />
      </Canvas>
    </div>
  )
}
