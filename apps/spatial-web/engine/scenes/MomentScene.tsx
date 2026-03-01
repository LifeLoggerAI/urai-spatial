'use client'

import { useSceneStore } from '../state/useSceneStore'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

export default function MomentScene() {
  const { scene } = useThree()

  const activeMemoryId = useSceneStore((s) => s.activeMemoryId)
  const setScene = useSceneStore((s) => s.setScene)
  const setActiveMemory = useSceneStore((s) => s.setActiveMemory)

  useEffect(() => {
    scene.background = new THREE.Color('#0c1224')
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.6} />

      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        color="#7aa0ff"
      />

      {/* Placeholder memory sphere */}
      <mesh>
        <sphereGeometry args={[30, 64, 64]} />
        <meshStandardMaterial
          color="#1d2a4f"
          emissive="#2c3f7a"
          emissiveIntensity={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Return to LifeMap */}
      <mesh
        position={[0, -35, 0]}
        onClick={() => {
          setActiveMemory(null)
          setScene('lifemap')
        }}
      >
        <boxGeometry args={[14, 4, 2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </>
  )
}