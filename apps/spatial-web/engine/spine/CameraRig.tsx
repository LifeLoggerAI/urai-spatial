'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function CameraRig() {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / size.height

    // Only adjust FOV based on screen size
    // DO NOT touch camera.position here
    if (aspect < 1) {
      camera.fov = 52
    } else {
      camera.fov = 48
    }

    camera.updateProjectionMatrix()
  }, [size, camera])

  return null
}