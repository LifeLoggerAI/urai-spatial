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
    position: new Vector3(0, 0.72, 5.35),
    target: new Vector3(0, -0.18, -2.85),
    fov: 53,
    drift: { x: 0.28, y: 0.055, z: 0.18, speed: 0.18 },
  },
  skyTap: {
    position: new Vector3(0, 1.25, 4.2),
    target: new Vector3(0, 1.25, -4.6),
    fov: 58,
    drift: { x: 0.22, y: 0.08, z: 0.12, speed: 0.16 },
  },
  memoryZoom: {
    position: new Vector3(0.2, 0.62, 2.72),
    target: new Vector3(0, -0.05, -1.3),
    fov: 45,
    drift: { x: 0.12, y: 0.04, z: 0.08, speed: 0.2 },
  },
  narratorReveal: {
    position: new Vector3(-0.35, 0.86, 3.75),
    target: new Vector3(0, 0.05, -1.75),
    fov: 48,
    drift: { x: 0.18, y: 0.05, z: 0.1, speed: 0.14 },
  },
  orbFocus: {
    position: new Vector3(0.1, 0.36, 2.2),
    target: new Vector3(0, -0.3, -1.18),
    fov: 42,
    drift: { x: 0.08, y: 0.035, z: 0.06, speed: 0.22 },
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
