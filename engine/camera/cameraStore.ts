import * as THREE from "three"

export interface CameraTargetState {
  active: boolean
  position: THREE.Vector3
  lookAt: THREE.Vector3
}

export const cameraTarget: CameraTargetState = {
  active: false,
  position: new THREE.Vector3(),
  lookAt: new THREE.Vector3(),
}

export function setCameraTarget(
  position: THREE.Vector3,
  lookAt: THREE.Vector3
) {
  cameraTarget.active = true
  cameraTarget.position.copy(position)
  cameraTarget.lookAt.copy(lookAt)
}

export function clearCameraTarget() {
  cameraTarget.active = false
}