
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useIdentityStore } from '../state/identity-store'

export default function EmotionalBiomeSystem() {
  const { scene } = useThree()
  const { emotionalBiome } = useIdentityStore()

  const currentColor = useRef(new THREE.Color('#0b1020'))
  const targetColor = useRef(new THREE.Color('#0b1020'))
  const currentFogFar = useRef(20)
  const targetFogFar = useRef(20)

  useFrame((_, delta) => {
    const { tone, intensity } = emotionalBiome

    if (tone === 'heavy') {
      targetColor.current.set('#050814')
      targetFogFar.current = 15 - intensity * 5
    } else if (tone === 'elevated') {
      targetColor.current.set('#1a2040')
      targetFogFar.current = 22
    } else {
      targetColor.current.set('#0b1020')
      targetFogFar.current = 20
    }

    const lerpSpeed = 2
    const alpha = 1 - Math.exp(-lerpSpeed * delta)

    currentColor.current.lerp(targetColor.current, alpha)
    currentFogFar.current +=
      (targetFogFar.current - currentFogFar.current) * alpha

    scene.background = currentColor.current
    scene.fog = new THREE.Fog(currentColor.current, 5, currentFogFar.current)
  })

  return null
}
