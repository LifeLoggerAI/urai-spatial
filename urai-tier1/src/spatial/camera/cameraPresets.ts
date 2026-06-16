import type { CameraPriority, UnifiedCameraMode, UnifiedCameraPose } from './UnifiedCameraTypes';

export const CAMERA_PRIORITY_RANK: Record<CameraPriority, number> = {
  base: 0,
  cinematic: 1,
  scene: 2,
  lock: 3,
  xr: 4,
};

export const CAMERA_PRESETS: Record<UnifiedCameraMode, UnifiedCameraPose> = {
  home: {
    position: [0, 2.6, 7],
    target: [0, 1.2, 0],
    fov: 45,
    near: 0.1,
    far: 1000,
    damping: 0.075,
  },
  lifeMap: {
    position: [0, 9, 13],
    target: [0, 0, 0],
    fov: 50,
    near: 0.1,
    far: 1500,
    damping: 0.065,
  },
  replay: {
    position: [0, 3.5, 9],
    target: [0, 1, 0],
    fov: 42,
    near: 0.1,
    far: 1200,
    damping: 0.055,
  },
  focus: {
    position: [0, 1.8, 4.8],
    target: [0, 1.2, 0],
    fov: 38,
    near: 0.1,
    far: 800,
    damping: 0.08,
  },
  place: {
    position: [2, 2.4, 6],
    target: [0, 1, 0],
    fov: 44,
    near: 0.1,
    far: 1000,
    damping: 0.065,
  },
  xr: {
    position: [0, 1.6, 0],
    target: [0, 1.6, -1],
    fov: 60,
    near: 0.01,
    far: 1000,
    damping: 1,
  },
  transition: {
    position: [0, 2.6, 7],
    target: [0, 1.2, 0],
    fov: 45,
    near: 0.1,
    far: 1000,
    damping: 0.075,
  },
};

export function priorityRank(priority: CameraPriority): number {
  return CAMERA_PRIORITY_RANK[priority];
}
