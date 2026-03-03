'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../state/sceneStore'

export default function Ground() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { mode } = useSceneStore()

  useFrame(({ scene }) => {
    if (!scene.fog) return
    const targetFog = mode === 'memory' || mode === 'replay' ? 0.08 : 0.02
    scene.fog.near = 1
    scene.fog.far += (200 - scene.fog.far) * 0.02
    scene.fog.density += (targetFog - scene.fog.density) * 0.02
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
      <circleGeometry args={[200, 64]} />
      <meshStandardMaterial color="#050505" roughness={1} metalness={0} />
    </mesh>
  )
}
