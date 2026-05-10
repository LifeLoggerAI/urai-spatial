import { Vector3 } from 'three'

export type CameraPathKey =
  | 'arrival'
  | 'skyTap'
  | 'ascentReveal'
  | 'lifeMapArrival'
  | 'memoryZoom'
  | 'narratorReveal'
  | 'orbFocus'
  | 'replayDive'

export type CameraPathMotion = {
  transitionSpeed: number
  positionLerp: number
  targetLerp: number
  fovLerp: number
  transitionImpulse: number
  depthImpulse: number
  verticalImpulse: number
  roll: number
  driftMultiplier: number
}

export type CameraPathPreset = {
  position: Vector3
  target: Vector3
  fov: number
  drift: {
    x: number
    y: number
    z: number
    speed: number
  }
  motion: CameraPathMotion
}

const defaultMotion: CameraPathMotion = {
  transitionSpeed: 0.62,
  positionLerp: 0.026,
  targetLerp: 0.032,
  fovLerp: 0.035,
  transitionImpulse: 0.12,
  depthImpulse: 0.1,
  verticalImpulse: 0.04,
  roll: 0,
  driftMultiplier: 1,
}

export const cameraPathPresets: Record<CameraPathKey, CameraPathPreset> = {
  arrival: {
    position: new Vector3(0, 2.2, 7.5),
    target: new Vector3(0, 1.1, 0),
    fov: 48,
    drift: { x: 0.18, y: 0.045, z: 0.12, speed: 0.12 },
    motion: { ...defaultMotion, transitionSpeed: 0.52, roll: 0.0015 },
  },
  skyTap: {
    position: new Vector3(0, 5.5, 5.2),
    target: new Vector3(0, 2.4, 0),
    fov: 50,
    drift: { x: 0.16, y: 0.06, z: 0.11, speed: 0.11 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.58,
      transitionImpulse: 0.14,
      depthImpulse: 0.14,
      verticalImpulse: 0.06,
      roll: 0.002,
    },
  },
  ascentReveal: {
    position: new Vector3(0, 7, 4.2),
    target: new Vector3(0, 3.6, 0),
    fov: 47,
    drift: { x: 0.1, y: 0.055, z: 0.08, speed: 0.09 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.72,
      positionLerp: 0.032,
      targetLerp: 0.04,
      fovLerp: 0.04,
      transitionImpulse: 0.16,
      depthImpulse: 0.18,
      verticalImpulse: 0.08,
      roll: 0.0025,
      driftMultiplier: 0.72,
    },
  },
  lifeMapArrival: {
    position: new Vector3(0, 3.8, 9.5),
    target: new Vector3(0, 0.6, 0),
    fov: 50,
    drift: { x: 0.22, y: 0.07, z: 0.16, speed: 0.1 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.68,
      positionLerp: 0.03,
      targetLerp: 0.038,
      fovLerp: 0.038,
      transitionImpulse: 0.12,
      depthImpulse: 0.1,
      verticalImpulse: 0.04,
      roll: 0.002,
      driftMultiplier: 0.86,
    },
  },
  memoryZoom: {
    position: new Vector3(0.25, 1.38, 3.85),
    target: new Vector3(0, -0.04, -1.65),
    fov: 43,
    drift: { x: 0.13, y: 0.05, z: 0.08, speed: 0.2 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.7,
      positionLerp: 0.033,
      targetLerp: 0.042,
      transitionImpulse: 0.2,
      depthImpulse: 0.24,
      verticalImpulse: 0.08,
      roll: 0.004,
    },
  },
  narratorReveal: {
    position: new Vector3(-0.45, 1.75, 5.15),
    target: new Vector3(0, 0.05, -1.9),
    fov: 46,
    drift: { x: 0.2, y: 0.065, z: 0.13, speed: 0.14 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.6,
      transitionImpulse: 0.14,
      depthImpulse: 0.16,
      verticalImpulse: 0.05,
      roll: 0.003,
    },
  },
  orbFocus: {
    position: new Vector3(0.14, 1.1, 3.05),
    target: new Vector3(0, -0.2, -1.18),
    fov: 40,
    drift: { x: 0.08, y: 0.04, z: 0.06, speed: 0.22 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.74,
      positionLerp: 0.036,
      targetLerp: 0.048,
      fovLerp: 0.042,
      transitionImpulse: 0.18,
      depthImpulse: 0.2,
      verticalImpulse: 0.06,
      roll: 0.004,
    },
  },
  replayDive: {
    position: new Vector3(0.18, 0.96, 2.34),
    target: new Vector3(0, -0.1, -1.02),
    fov: 37,
    drift: { x: 0.065, y: 0.038, z: 0.12, speed: 0.28 },
    motion: {
      ...defaultMotion,
      transitionSpeed: 0.92,
      positionLerp: 0.042,
      targetLerp: 0.062,
      fovLerp: 0.054,
      transitionImpulse: 0.42,
      depthImpulse: 0.72,
      verticalImpulse: 0.18,
      roll: 0.012,
      driftMultiplier: 1.45,
    },
  },
}

export function cameraPathForState({
  hasFocus,
  isNarrating,
  orbState,
  sceneMode,
}: {
  hasFocus: boolean
  isNarrating: boolean
  orbState: string
  sceneMode?: string
}): CameraPathKey {
  if (sceneMode === 'replay') return 'replayDive'
  if (sceneMode === 'focus') return 'memoryZoom'
  if (sceneMode === 'ascent') return 'ascentReveal'
  if (sceneMode === 'life-map' || sceneMode === 'demo') return 'lifeMapArrival'
  if (hasFocus) return 'memoryZoom'
  if (orbState === 'listening') return 'orbFocus'
  if (orbState === 'ritual' || orbState === 'recovery') return 'skyTap'
  if (isNarrating) return 'narratorReveal'
  return 'arrival'
}
