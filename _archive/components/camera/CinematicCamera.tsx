'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Cinematic idle drift camera.
 * Adds subtle breathing motion without hard-overwriting other rigs.
 */

export default function CinematicCamera() {
  const { camera } = useThree()

  const basePosition = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    basePosition.current.copy(camera.position)
  }, [camera])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    const driftX = Math.sin(t * 0.2) * 0.2
    const driftY = Math.cos(t * 0.15) * 0.15

    camera.position.x = basePosition.current.x + driftX
    camera.position.y = basePosition.current.y + driftY
    camera.position.z = basePosition.current.z

    camera.lookAt(lookTarget.current)
  })

  return null
}