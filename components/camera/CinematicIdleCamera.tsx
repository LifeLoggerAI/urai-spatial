'use client'

import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Subtle idle breathing motion for the camera.
 * Safe to run alongside other camera systems because
 * it preserves the existing Z distance.
 */

export default function CinematicIdleCamera() {

  const { camera } = useThree()

  useFrame((state) => {

    const t = state.clock.elapsedTime

    const x = Math.sin(t * 0.2) * 0.2
    const y = Math.cos(t * 0.15) * 0.15

    camera.position.set(x, y, camera.position.z)

    camera.lookAt(new THREE.Vector3(0, 0, 0))

  })

  return null
}