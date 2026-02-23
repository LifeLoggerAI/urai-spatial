'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export default function ResponsiveCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    // URAI V1 Cinematic Camera Lock
    camera.position.set(0, 2.55, 6)
    camera.lookAt(0, 0.6, 0)
    camera.fov = 75
    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}
