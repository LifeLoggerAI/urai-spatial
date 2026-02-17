
'use client'

import { useFrame, useThree } from '@react-three/fiber';

/**
 * A cinematic camera that slowly drifts, creating a breathing effect.
 */
export default function CinematicCamera() {
  const { camera } = useThree()

  useFrame((state) => {
    const t = state.clock.elapsedTime

    camera.position.x = Math.sin(t * 0.2) * 0.2
    camera.position.y = Math.cos(t * 0.15) * 0.15
    camera.lookAt(0, 0, 0)
  })

  return null
}
