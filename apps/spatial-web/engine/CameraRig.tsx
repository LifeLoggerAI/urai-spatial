'use client'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useLifeMapStore } from './state/useLifeMapStore'

export default function CameraRig() {
  const { camera } = useThree()
  const selectedPosition = useLifeMapStore((s) => s.selectedPosition)

  useFrame(() => {
    if (!selectedPosition) return
    const target = selectedPosition.clone().add(new THREE.Vector3(0, 0, 3))
    camera.position.lerp(target, 0.05)
    camera.lookAt(selectedPosition)
  })

  return null
}
