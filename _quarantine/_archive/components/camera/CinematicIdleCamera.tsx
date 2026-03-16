'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Subtle additive idle motion for the camera.
 * Safer than hard-setting absolute x/y every frame.
 */

export default function CinematicIdleCamera() {
  const { camera } = useThree()

  const basePosition = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    basePosition.current.copy(camera.position)
  }, [camera])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    const offsetX = Math.sin(t * 0.2) * 0.2
    const offsetY = Math.cos(t * 0.15) * 0.15

    camera.position.set(
      basePosition.current.x + offsetX,
      basePosition.current.y + offsetY,
      basePosition.current.z
    )

    camera.lookAt(target.current)
  })

  return null
}