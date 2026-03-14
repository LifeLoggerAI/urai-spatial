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

export const cameraPresets: Record<CameraPresetKey, CameraPreset> = {
  home: {
    position: [0, 1.6, 6],
    target: [0, 1, 0],
  },

  sky: {
    position: [0, 8, 20],
    target: [0, 0, 0],
  },

  lifemap: {
    position: [0, 15, 40],
    target: [0, 0, 0],
  },

  star: {
    // fallback position used when a star has no custom camera target
    position: [0, 5, 10],
    target: [0, 0, 0],
  },
} as const