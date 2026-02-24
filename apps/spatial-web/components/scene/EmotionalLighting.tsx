'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/engine/core/scene-store'

const lightingStates = {
  home: {
    ambient: 0.5,
    directional: 0.4,
  },
  lifereview: {
    ambient: 0.4,
    directional: 0.3,
  },
  launch: {
    ambient: 0.6,
    directional: 0.5,
  },
  replay: {
    ambient: 0.3,
    directional: 0.2,
  },
  default: {
    ambient: 0.5,
    directional: 0.4,
  },
}

const getTargetLighting = (sceneType) => {
  return lightingStates[sceneType] || lightingStates.default
}

export default function EmotionalLighting() {
  const sceneType = useSceneStore((state) => state.scene.type)
  const targetLighting = useMemo(() => getTargetLighting(sceneType), [sceneType])

  return (
    <>
      <ambientLight intensity={targetLighting.ambient} />
      <directionalLight position={[5, 5, 5]} intensity={targetLighting.directional} />
    </>
  )
}
