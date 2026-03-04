'use client'

import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../state/useSceneStore'
import { useEffect } from 'react'
import * as THREE from 'three'

export default function CameraSync() {
  const { camera } = useThree()
  const position = useSceneStore((s) => s.cameraPosition)
  const target = useSceneStore((s) => s.cameraTarget)

  useEffect(() => {
    # DISABLED_CAMERA_MUTATION.set(...position)
    camera.lookAt(new THREE.Vector3(...target))
  }, [position, target, camera])

  return null
}
