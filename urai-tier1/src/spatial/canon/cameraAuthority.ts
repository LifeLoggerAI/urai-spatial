export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

export const HOME_POSE: CameraPose = {
  position: [0, 1.15, 8.8],
  target: [0, 0.95, 0],
  fov: 42,
}

export const LIFEMAP_POSE: CameraPose = {
  position: [0, 0.1, 11.2],
  target: [0, 0, 0],
  fov: 36,
}

export function focusPoseForStar(x: number, y: number, z: number): CameraPose {
  return {
    position: [x * 0.16, y * 0.12, z + 6.1],
    target: [x, y, z],
    fov: 28,
  }
}

export function replayPoseForStar(x: number, y: number, z: number): CameraPose {
  return {
    position: [x * 0.08, y * 0.08 - 0.15, z + 3.25],
    target: [x, y, z - 0.35],
    fov: 24,
  }
}
