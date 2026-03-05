'use client'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSpatialStore } from './state/useSpatialStore'

export default function CameraRig() {
  const { camera } = useThree()
  const selectedStarId = useSpatialStore((s) => s.selectedStarId)
  const homePosition = useSpatialStore((s) => s.homePosition)
  const homeTarget = useSpatialStore((s) => s.homeTarget)

  // Derive selectedPosition directly in the camera rig. This is a temporary solution.
  // A better architecture would have a selector in the store to avoid this coupling.
  const selectedPosition = useMemo(() => {
    if (selectedStarId === null) return null
    return new THREE.Vector3((selectedStarId - 10) * 10, 0, 0)
  }, [selectedStarId])

  useFrame(() => {
    if (selectedPosition) {
      const target = selectedPosition.clone().add(new THREE.Vector3(0, 0, 3))
      camera.position.lerp(target, 0.05)
      camera.lookAt(selectedPosition)
    } else {
      camera.position.lerp(homePosition, 0.05)
      camera.lookAt(homeTarget)
    }
  })

  return null
}
