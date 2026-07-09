import { spatialCameraContract, URAI_CAMERA_CONTRACT_VERSION } from './spatialCameraContract'

export type SpatialCameraMode = keyof typeof spatialCameraContract.states

export type SpatialCameraState = {
  mode: SpatialCameraMode
  reducedMotion: boolean
  intensity: number
}

export function createSpatialCameraState(): SpatialCameraState {
  return {
    mode: 'arrival',
    reducedMotion: false,
    intensity: 0.25,
  }
}

export function resolveCameraTransition(state: SpatialCameraState) {
  return {
    contract: URAI_CAMERA_CONTRACT_VERSION,
    mode: state.mode,
    duration: state.reducedMotion ? 0 : 760,
    easing: 'smooth-in-out',
    motion: spatialCameraContract.motion,
    forbidden: spatialCameraContract.accessibility.avoid,
  }
}

export function selectMemoryStarCamera() {
  return {
    path: ['observe-star', 'ease-forward', 'increase-depth', 'enter-memory'],
    preservesContext: true,
  }
}
