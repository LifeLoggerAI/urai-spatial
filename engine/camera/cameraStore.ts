import * as THREE from "three"

export interface CameraTargetState {
  active: boolean
  position: THREE.Vector3
  lookAt: THREE.Vector3
}

const position = new THREE.Vector3()
const lookAt = new THREE.Vector3()

export const cameraTarget: CameraTargetState = {
  active: false,
  position,
  lookAt
}

export function setCameraTarget(
  targetPosition: THREE.Vector3,
  targetLookAt: THREE.Vector3
) {
  position.copy(targetPosition)
  lookAt.copy(targetLookAt)
  cameraTarget.active = true
}

export function clearCameraTarget() {
  cameraTarget.active = false
}