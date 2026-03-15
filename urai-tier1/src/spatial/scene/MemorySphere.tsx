'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../state/sceneStore'

export default function MemorySphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  const mode = useSceneStore((s) => s.mode)
  const visible = mode === 'memory' || mode === 'replay'

  const materialProps = useMemo(
    () => ({
      color: '#9bb8ff',
      emissive: '#88aaff',
      emissiveIntensity: 0.35,
      transmission: 0.92,
      roughness: 0.08,
      metalness: 0,
      thickness: 0.9,
      ior: 1.12,
      transparent: true,
      opacity: 1,
    }),
    []
  )

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh || !visible) return

    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 1.2) * 0.02
    mesh.scale.setScalar(pulse)
    mesh.rotation.y = t * 0.12
  })

  if (!visible) return null

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={10}>
      <sphereGeometry args={[3, 64, 64]} />
      <meshPhysicalMaterial {...materialProps} />
    </mesh>
  )
}