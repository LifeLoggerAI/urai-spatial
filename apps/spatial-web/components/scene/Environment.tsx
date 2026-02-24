'use client'

import { useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/engine/core/scene-store'

const skyStates = {
  home: {
    fogColor: new THREE.Color('#000814'),
    fogDensity: 0.042,
  },
  lifereview: {
    fogColor: new THREE.Color('#020617'),
    fogDensity: 0.045,
  },
  launch: {
    fogColor: new THREE.Color('#000814'),
    fogDensity: 0.05,
  },
  replay: {
    fogColor: new THREE.Color('#000000'),
    fogDensity: 0.06,
  },
  default: {
    fogColor: new THREE.Color('#000814'),
    fogDensity: 0.042,
  },
}

const getTargetState = (sceneType) => {
  return skyStates[sceneType] || skyStates.default
}

export default function Environment() {
  const { scene } = useThree()
  const sceneType = useSceneStore((state) => state.scene.type)

  const targetState = useMemo(() => getTargetState(sceneType), [sceneType])

  useEffect(() => {
    scene.fog = new THREE.FogExp2(targetState.fogColor, targetState.fogDensity)
    scene.background = targetState.fogColor
  }, [scene, targetState])

  useFrame(() => {
    if (scene.fog) {
      scene.fog.color.lerp(targetState.fogColor, 0.05)
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetState.fogDensity, 0.05)
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(targetState.fogColor, 0.05)
      }
    }
  })

  return null
}
