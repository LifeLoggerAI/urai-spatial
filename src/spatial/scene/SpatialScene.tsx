'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import { Vector3 } from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import InstancedStars from './InstancedStars'

function CameraRig() {
  const { camera, size } = useThree()
  const t = useRef(0)

  useEffect(() => {
    camera.aspect = size.width / size.height
    camera.updateProjectionMatrix()
  }, [size, camera])

  useFrame((_, delta) => {
    t.current += delta * 0.05
    camera.position.x = Math.sin(t.current) * 25
    camera.position.z = 100 + Math.cos(t.current) * 15
    camera.position.y = 40 + Math.sin(t.current * 0.5) * 10
    camera.lookAt(0, 0, 0)
  })

  return null
}

export default function SpatialScene() {
  const handleEsc = () => console.log('ESC pressed')

  useEffect(() => {
    const listener = (e) => e.key === 'Escape' && handleEsc()
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <Canvas shadows camera={{ position: [0, 40, 100], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[150, 150, 150]} intensity={1} />
      <InstancedStars />
      <CameraRig />
      <OrbitControls enablePan enableZoom enableRotate target={new Vector3(0,0,0)} />
      <EffectComposer>
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} opacity={1.5} />
      </EffectComposer>
    </Canvas>
  )
}
