export type Vec3 = [number, number, number]

export interface CameraPreset {
  position: Vec3
  target: Vec3
}

export type CameraPresetKey =
  | "home"
  | "sky"
  | "lifemap"
  | "star"
  | "memory"

export const cameraPresets: Record<CameraPresetKey, CameraPreset> = {
  home: {
    // starting view near the avatar / ground
    position: [0, 1.6, 6],
    target: [0, 1, 0],
  },

  sky: {
    // sky exploration camera
    position: [0, 8, 20],
    target: [0, 0, 0],
  },

  lifemap: {
    // galaxy / starfield overview
    position: [0, 15, 40],
    target: [0, 0, 0],
  },

  star: {
    // fallback when focusing on a star
    position: [0, 5, 10],
    target: [0, 0, 0],
  },

  memory: {
    // camera inside memory sphere
    position: [0, 0, 2.5],
    target: [0, 0, 0],
  },
} as const