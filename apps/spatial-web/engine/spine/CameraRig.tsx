/**
 * URAI Tier 1 LOCK
 * Deterministic camera glide system
 * DO NOT MODIFY WITHOUT EXPLICIT EXPANSION AUTHORIZATION
 */

'use client'

import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useLifeMapStore } from '../state/useLifeMapStore'

const GLIDE_SPEED = 0.06
const EPSILON = 0.01

export default function CameraRig() {
  const { camera } = useThree()
  const selectedPosition = useLifeMapStore((s) => s.selectedPosition)

  const target = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!selectedPosition) return

    target.current.set(
      selectedPosition.x,
      selectedPosition.y,
      selectedPosition.z + 20
    )

    lookTarget.current.set(
      selectedPosition.x,
      selectedPosition.y,
      selectedPosition.z
    )

    camera.position.lerp(target.current, GLIDE_SPEED)
    camera.lookAt(lookTarget.current)

    if (camera.position.distanceTo(target.current) < EPSILON) {
      camera.position.copy(target.current)
    }
  })

  return null
}
