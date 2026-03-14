'use client'

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Cinematic idle drift camera.
 * Adds subtle breathing motion without fighting other camera rigs.
 */

export default function CinematicCamera() {

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