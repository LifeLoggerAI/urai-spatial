'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

// Simple procedural starfield
function Starfield() {
  const group = useRef<THREE.Group>(null)
  const starCount = 3000
  const radius = 50

  const stars = useMemo(() => {
    const temp: THREE.Vector3[] = []
    for (let i = 0; i < starCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1)
      const theta = 2 * Math.PI * Math.random()
      const r = radius * Math.cbrt(Math.random()) // distribute in 3D
      temp.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ))
    }
    return temp
  }, [])

  return (
    <group ref={group}>
      {stars.map((pos, i) => (
        <mesh key={i} position={pos.toArray()}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
    </group>
  )
}

// Subtle camera drift / cinematic feel
function CameraRig() {
  const { camera, size } = useThree()
  const t = useRef(0)

  useEffect(() => {
    camera.aspect = size.width / size.height
    camera.updateProjectionMatrix()
  }, [size, camera])

  useFrame((_, delta) => {
    t.current += delta * 0.05
    camera.position.x = Math.sin(t.current) * 20
    camera.position.z = 80 + Math.cos(t.current) * 10
    camera.position.y = 30 + Math.sin(t.current * 0.5) * 5
    camera.lookAt(0, 0, 0)
  })

  return null
}

export default function SpatialScene() {
  const handleEsc = () => console.log('ESC pressed')

  useEffect(() => {
    const listener = (e: KeyboardEvent) => e.key === 'Escape' && handleEsc()
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <Canvas shadows camera={{ position: [0, 30, 80], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      <Starfield />
      <CameraRig />
      <OrbitControls enablePan enableZoom enableRotate target={new THREE.Vector3(0, 0, 0)} />
    </Canvas>
  )
}