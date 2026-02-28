'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEmotionStore } from '../state/emotion-store'
import * as THREE from 'three'

export default function SkyEmotionLayer() {
  const { scene } = useThree()
  const { state, intensity, thresholdActive } = useEmotionStore()

  useFrame(() => {
    const fog = scene.fog as THREE.FogExp2
    if (!fog) return

    let targetDensity = 0.012

    switch (state) {
      case 'anxiety':
        targetDensity = 0.018 + intensity * 0.01
        break

      case 'grief':
        targetDensity = 0.03 + intensity * 0.02
        break

      case 'clarity':
        targetDensity = 0.006
        break

      case 'recovery':
        targetDensity = 0.01
        break

      case 'growth':
        targetDensity = 0.009
        break

      case 'breakthrough':
        targetDensity = 0.005
        break

      case 'trauma':
        targetDensity = 0.035 + intensity * 0.02
        break

      default:
        targetDensity = 0.012
    }

    if (thresholdActive) {
      targetDensity *= 1.15
    }

    // Smooth lerp (prevents popping)
    fog.density += (targetDensity - fog.density) * 0.05
  })

  return null
}
