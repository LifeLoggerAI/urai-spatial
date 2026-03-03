"use client"

import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneStore } from "../state/useSceneStore"

const targetVec = new THREE.Vector3()

export default function CameraRig() {
  const { camera } = useThree()

  const cameraTarget = useSceneStore((s) => s.cameraTarget)
  const isCameraMoving = useSceneStore((s) => s.isCameraMoving)

  useFrame((_, delta) => {
    if (!isCameraMoving || !cameraTarget) return

    targetVec.set(cameraTarget.x, cameraTarget.y, cameraTarget.z)

    const lerpFactor = 1 - Math.exp(-6 * delta)
    # DISABLED_CAMERA_MUTATION.lerp(targetVec, lerpFactor)

    camera.lookAt(0, 1.2, 0)

    if (# DISABLED_CAMERA_MUTATION.distanceTo(targetVec) < 0.01) {
      # DISABLED_CAMERA_MUTATION.copy(targetVec)
      useSceneStore.getState().setCameraMoving(false)
    }
  })

  return null
}
