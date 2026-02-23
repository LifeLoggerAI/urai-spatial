'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useWorld } from '../components/worldState'
import gsap from 'gsap'
import { DURATION_SLOW, EASE_STANDARD } from '../lib/motion'

const cameraSettings = {
  home: { position: [0, 2.2, 5.0], target: [0, 0.5, 0] },
  lifemap: { position: [0, 5, 12], target: [0, 0, 0] },
  replay: { position: [3, 2, 5], target: [0, 0, 0] },
}

export default function CameraController() {
  const { camera, controls } = useThree()
  const { mode } = useWorld()

  useEffect(() => {
    if (!controls) return

    const { position, target } = cameraSettings[mode]

    gsap.to(camera.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration: DURATION_SLOW,
      ease: EASE_STANDARD,
    })

    gsap.to(controls.target, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration: DURATION_SLOW,
      ease: EASE_STANDARD,
    })
  }, [mode, camera, controls])

  return null
}
