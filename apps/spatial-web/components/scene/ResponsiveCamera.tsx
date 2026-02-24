'use client'

import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { easing } from 'maath'

export default function ResponsiveCamera() {
  const { camera, viewport } = useThree()
  const isMobile = viewport.width < 6

  const cameraPosition = isMobile ? [0, 1.4, 6.8] : [0, 1.2, 5.2]
  const fov = isMobile ? 55 : 45

  useEffect(() => {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, fov])

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    const breathFrequency = 0.15
    const driftAmplitude = 0.02

    easing.damp3(
      camera.position,
      [
        cameraPosition[0] + Math.sin(time * breathFrequency) * driftAmplitude,
        cameraPosition[1] + Math.cos(time * breathFrequency) * driftAmplitude,
        cameraPosition[2],
      ],
      0.2,
      delta
    )
    camera.lookAt(0, 0.6, 0)
  })

  return null
}
