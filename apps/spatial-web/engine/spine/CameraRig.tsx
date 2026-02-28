'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function CameraRig() {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / size.height

    // Portrait (mobile tall)
    if (aspect < 1) {
      camera.position.set(0, 0, 6)
    }

    // Landscape / Desktop
    else {
      camera.position.set(0, 0, 8)
    }

    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}
