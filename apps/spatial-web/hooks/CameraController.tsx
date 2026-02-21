'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useWorld } from '../components/worldState'
import gsap from 'gsap'

const cameraSettings = {
  home: { position: [0, 2, 8], target: [0, 1, 0] },
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
      duration: 2.5,
      ease: 'power3.inOut',
    })

    gsap.to(controls.target, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration: 2.5,
      ease: 'power3.inOut',
    })
  }, [mode, camera, controls])

  return null
}
