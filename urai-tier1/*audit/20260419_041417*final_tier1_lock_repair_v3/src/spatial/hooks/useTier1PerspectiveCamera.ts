'use client'

import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'

export function useTier1PerspectiveCamera(): PerspectiveCamera {
  const camera = useThree((state) => state.camera)
  return camera as PerspectiveCamera
}
