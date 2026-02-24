'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/engine/core/scene-store'

const auraStates = {
  home: {
    visible: true,
    color: new THREE.Color('#4f8ac9'),
    scale: 1.3,
    opacity: 0.15,
  },
  lifereview: {
    visible: true,
    color: new THREE.Color('#ffffff'),
    scale: 1.5,
    opacity: 0.1,
  },
  launch: {
    visible: true,
    color: new THREE.Color('#ffffff'),
    scale: 1.6,
    opacity: 0.2,
  },
  replay: {
    visible: true,
    color: new THREE.Color('#ffffff'),
    scale: 1.8,
    opacity: 0.25,
  },
  default: {
    visible: false,
  },
}

const getAuraState = (sceneType) => {
  return auraStates[sceneType] || auraStates.default
}

export default function OrbAura() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const sceneType = useSceneStore((state) => state.scene.type)
  const auraState = getAuraState(sceneType)

  useFrame((state) => {
    if (!meshRef.current) return

    const t = state.clock.elapsedTime
    const breath = Math.sin(t * 0.5) * 0.1

    meshRef.current.scale.set(
      auraState.scale + breath,
      auraState.scale + breath,
      auraState.scale + breath
    )

    meshRef.current.material.opacity = auraState.opacity + Math.sin(t * 0.5) * 0.05
  })

  if (!auraState.visible) return null

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <meshBasicMaterial
        color={auraState.color}
        transparent
        opacity={auraState.opacity}
        depthWrite={false}
      />
    </mesh>
  )
}
