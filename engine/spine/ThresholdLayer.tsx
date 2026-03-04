'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEmotionStore } from '../state/emotion-store'
import { useRef } from 'react'
import * as THREE from 'three'

export default function ThresholdLayer() {
  const { scene } = useThree()
  const { thresholdActive } = useEmotionStore()

  const timeScale = useRef(1)
  const desaturation = useRef(0)

  useFrame(() => {
    const fog = scene.fog as THREE.FogExp2
    if (!fog) return

    const targetTimeScale = thresholdActive ? 0.85 : 1
    const targetDesat = thresholdActive ? 0.15 : 0

    timeScale.current += (targetTimeScale - timeScale.current) * 0.02
    desaturation.current += (targetDesat - desaturation.current) * 0.02

    // Slight global fog increase
    if (thresholdActive) {
      fog.density += (fog.density * 1.1 - fog.density) * 0.02
    }

    // Slight background shift (if background color exists)
    if (scene.background instanceof THREE.Color) {
      const base = new THREE.Color('#0b0f1a')
      const darker = new THREE.Color('#080c14')
      scene.background.lerp(
        thresholdActive ? darker : base,
        0.01
      )
    }
  })

  return null
}
