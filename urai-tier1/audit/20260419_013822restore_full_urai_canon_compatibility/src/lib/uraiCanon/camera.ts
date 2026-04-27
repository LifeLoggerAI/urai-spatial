import type {
  CameraConvergenceSpec,
  CameraPose,
  ScenePhase,
} from "./types";

export const PERFORMANCE_BUDGET = {
  targetFps: 60,
  maxDpr: 2,
  maxStars: 2400,
  maxParticles: 1800,
  lodBias: 1,
};

export const CAMERA_POSES: Record<ScenePhase, CameraPose> = {
  HOME: { position: [0, 0.3, 7.8], target: [0, -0.8, -8.5], fov: 42 },
  ASCENT: { position: [0, 2.3, 5.4], target: [0, 0.45, -10.5], fov: 43 },
  LIFEMAP: { position: [0, 0.6, 9.6], target: [0, 0.1, -14.5], fov: 44 },
  FOCUS: { position: [0.2, 0.16, 5.4], target: [0, 0, -8], fov: 40 },
  REPLAY: { position: [0, 0, 1.85], target: [0, 0, -2.5], fov: 48 },
  OPEN_REPLAY: { position: [0, 0, 1.95], target: [0, 0, -2.6], fov: 47 },
  CLOSE_REPLAY: { position: [0.08, 0.08, 2.6], target: [0, 0.02, -4.8], fov: 45 },
  DESCENT: { position: [0, 1.3, 7.2], target: [0, -0.25, -10.0], fov: 43 },
  EXIT_FOCUS: { position: [0.1, 0.35, 7.2], target: [0, 0.08, -10.8], fov: 43 },
  EXIT_REPLAY: { position: [0.1, 0.08, 3.2], target: [0, 0.02, -5.2], fov: 45 },
  idle: { position: [0, 0.3, 7.8], target: [0, -0.8, -8.5], fov: 42 },
};

export const CAMERA_CONVERGENCE: Record<ScenePhase, CameraConvergenceSpec> = {
  HOME: { pose: CAMERA_POSES.HOME, durationMs: 900, damping: 0.12 },
  ASCENT: { pose: CAMERA_POSES.ASCENT, durationMs: 1800, damping: 0.10 },
  LIFEMAP: { pose: CAMERA_POSES.LIFEMAP, durationMs: 900, damping: 0.14 },
  FOCUS: { pose: CAMERA_POSES.FOCUS, durationMs: 850, damping: 0.16 },
  REPLAY: { pose: CAMERA_POSES.REPLAY, durationMs: 1100, damping: 0.18 },
  OPEN_REPLAY: { pose: CAMERA_POSES.OPEN_REPLAY, durationMs: 1100, damping: 0.18 },
  CLOSE_REPLAY: { pose: CAMERA_POSES.CLOSE_REPLAY, durationMs: 900, damping: 0.16 },
  DESCENT: { pose: CAMERA_POSES.DESCENT, durationMs: 1200, damping: 0.11 },
  EXIT_FOCUS: { pose: CAMERA_POSES.EXIT_FOCUS, durationMs: 900, damping: 0.13 },
  EXIT_REPLAY: { pose: CAMERA_POSES.EXIT_REPLAY, durationMs: 850, damping: 0.14 },
  idle: { pose: CAMERA_POSES.idle, durationMs: 0, damping: 0.12 },
};
