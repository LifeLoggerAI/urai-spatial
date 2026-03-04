'use client'

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useEmotionStore } from '../state/emotion-store'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

export default function EmotionalPostFX() {
  const { state, intensity } = useEmotionStore()
  const bloomRef = useRef<any>(null)

  useFrame(() => {
    if (!bloomRef.current) return

    let baseIntensity = 0.15

    switch (state) {
      case 'breakthrough':
        baseIntensity = 0.35
        break
      case 'clarity':
        baseIntensity = 0.25
        break
      case 'growth':
        baseIntensity = 0.22
        break
      case 'grief':
        baseIntensity = 0.08
        break
      case 'trauma':
        baseIntensity = 0.05
        break
      default:
        baseIntensity = 0.15
    }

    const target = baseIntensity * (0.8 + intensity * 0.4)

    bloomRef.current.intensity +=
      (target - bloomRef.current.intensity) * 0.05
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        ref={bloomRef}
        intensity={0.15}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
      />
      <Vignette
        eskil={false}
        offset={0.2}
        darkness={0.5}
      />
    </EffectComposer>
  )
}
