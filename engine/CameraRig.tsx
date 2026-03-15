'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSpatialStore } from './state/useSpatialStore'

export default function CameraRig() {
  const { camera } = useThree()

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)
  const homePosition = useSpatialStore((s) => s.homePosition)
  const homeTarget = useSpatialStore((s) => s.homeTarget)

  const desired = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const smoothLook = useRef(new THREE.Vector3())

  const cameraOffset = useMemo(() => new THREE.Vector3(0, 0, 3), [])

  // temporary placeholder only
  const selectedPosition = useMemo(() => {
    if (selectedStarId === null) return null

    const id =
      typeof selectedStarId === 'number'
        ? selectedStarId
        : Number(String(selectedStarId).replace(/\D/g, '')) || 0

    return new THREE.Vector3((id - 10) * 10, 0, 0)
  }, [selectedStarId])

  useFrame((_, delta) => {
    const posLerp = 1 - Math.exp(-4 * delta)
    const lookLerp = 1 - Math.exp(-6 * delta)

    if (selectedPosition) {
      look.current.copy(selectedPosition)
      desired.current.copy(selectedPosition).add(cameraOffset)
    } else {
      desired.current.copy(homePosition)
      look.current.copy(homeTarget)
    }

    camera.position.lerp(desired.current, posLerp)
    smoothLook.current.lerp(look.current, lookLerp)
    camera.lookAt(smoothLook.current)
  })

  return null
}