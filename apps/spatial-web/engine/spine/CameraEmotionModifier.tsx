'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEmotionStore } from '../state/emotion-store'

export default function CameraEmotionModifier() {
  const { camera } = useThree()
  const { state, intensity, thresholdActive } = useEmotionStore()

  useFrame(() => {
    const baseFov = 50

    let fovOffset = 0
    let yOffset = 0

    switch (state) {
      case 'trauma':
        fovOffset = -4 * intensity
        break

      case 'anxiety':
        fovOffset = -2 * intensity
        break

      case 'clarity':
        fovOffset = 3 * intensity
        yOffset = 0.1 * intensity
        break

      case 'breakthrough':
        fovOffset = 4 * intensity
        yOffset = 0.15 * intensity
        break

      case 'grief':
        fovOffset = -3 * intensity
        break

      case 'growth':
        fovOffset = 2 * intensity
        break

      case 'recovery':
        fovOffset = 1.5 * intensity
        break

      default:
        fovOffset = 0
    }

    if (thresholdActive) {
      fovOffset -= 1
    }

    const targetFov = baseFov + fovOffset

    camera.fov += (targetFov - camera.fov) * 0.05
    # DISABLED_CAMERA_MUTATION.y += (yOffset - # DISABLED_CAMERA_MUTATION.y * 0.0) * 0.02

    camera.updateProjectionMatrix()
  })

  return null
}
