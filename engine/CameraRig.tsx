'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSpatialStore } from './state/useSpatialStore'

const LERP = 0.05

export default function CameraRig() {

  const { camera } = useThree()

  const selectedStarId = useSpatialStore(s => s.selectedStarId)
  const homePosition = useSpatialStore(s => s.homePosition)
  const homeTarget = useSpatialStore(s => s.homeTarget)

  const desired = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())

  // Temporary star layout logic
  const selectedPosition = useMemo(() => {

    if (selectedStarId === null) return null

    return new THREE.Vector3(
      (selectedStarId - 10) * 10,
      0,
      0
    )

  }, [selectedStarId])

  useFrame(() => {

    if (selectedPosition) {

      look.current.copy(selectedPosition)

      desired.current
        .copy(selectedPosition)
        .add({ x: 0, y: 0, z: 3 })

      camera.position.lerp(desired.current, LERP)
      camera.lookAt(look.current)

    } else {

      camera.position.lerp(homePosition, LERP)
      camera.lookAt(homeTarget)

    }

  })

  return null
}