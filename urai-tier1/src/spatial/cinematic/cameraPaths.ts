import { Vector3 } from 'three'

export type CameraPathKey = 'arrival' | 'skyTap' | 'memoryZoom' | 'narratorReveal' | 'orbFocus'

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
}

export const cameraPathPresets: Record<CameraPathKey, CameraPathPreset> = {
  arrival: {
    position: new Vector3(0, 2.55, 7.85),
    target: new Vector3(0, -0.18, -2.7),
    fov: 48,
    drift: { x: 0.34, y: 0.08, z: 0.24, speed: 0.16 },
  },
  skyTap: {
    position: new Vector3(0, 2.9, 6.4),
    target: new Vector3(0, 0.95, -6.2),
    fov: 52,
    drift: { x: 0.28, y: 0.1, z: 0.18, speed: 0.14 },
  },
  memoryZoom: {
    position: new Vector3(0.25, 1.38, 3.85),
    target: new Vector3(0, -0.04, -1.65),
    fov: 43,
    drift: { x: 0.13, y: 0.05, z: 0.08, speed: 0.2 },
  },
  narratorReveal: {
    position: new Vector3(-0.45, 1.75, 5.15),
    target: new Vector3(0, 0.05, -1.9),
    fov: 46,
    drift: { x: 0.2, y: 0.065, z: 0.13, speed: 0.14 },
  },
  orbFocus: {
    position: new Vector3(0.14, 1.1, 3.05),
    target: new Vector3(0, -0.2, -1.18),
    fov: 40,
    drift: { x: 0.08, y: 0.04, z: 0.06, speed: 0.22 },
  },
}

export function cameraPathForState({
  hasFocus,
  isNarrating,
  orbState,
}: {
  hasFocus: boolean
  isNarrating: boolean
  orbState: string
}): CameraPathKey {
  if (hasFocus) return 'memoryZoom'
  if (orbState === 'listening') return 'orbFocus'
  if (orbState === 'ritual' || orbState === 'recovery') return 'skyTap'
  if (isNarrating) return 'narratorReveal'
  return 'arrival'
}
