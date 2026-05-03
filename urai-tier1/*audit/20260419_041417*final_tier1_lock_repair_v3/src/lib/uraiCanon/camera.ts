import type {
  CameraConvergenceSpec,
  CameraPose,
  ScenePhase,
} from "./types";

type CameraPhaseKey =
  | ScenePhase
  | "OPEN_REPLAY"
  | "CLOSE_REPLAY"
  | "DESCENT"
  | "EXIT_FOCUS"
  | "EXIT_REPLAY"
  | "idle";

export const CAMERA_POSES: Record<CameraPhaseKey, CameraPose> = {
  HOME: { position: [0, 1.35, 10.5], target: [0, 1.0, -8.0], fov: 42 },
  ASCENT: { position: [0, 6.8, 7.2], target: [0, 2.3, -28.0], fov: 43 },
  LIFEMAP: { position: [0, 8.4, -16.0], target: [0, 2.4, -70.0], fov: 45 },
  FOCUS: { position: [0.08, 0.08, 2.6], target: [0, 0.02, -4.8], fov: 45 },
  REPLAY: { position: [0.1, 0.08, 3.2], target: [0, 0.02, -5.2], fov: 45 },
  OPEN_REPLAY: { position: [0.1, 0.08, 3.2], target: [0, 0.02, -5.2], fov: 45 },
  CLOSE_REPLAY: { position: [0.08, 0.08, 2.6], target: [0, 0.02, -4.8], fov: 45 },
  DESCENT: { position: [0, 1.3, 7.2], target: [0, -0.25, -10.0], fov: 43 },
  EXIT_FOCUS: { position: [0.1, 0.35, 7.2], target: [0, 0.08, -10.8], fov: 43 },
  EXIT_REPLAY: { position: [0.1, 0.08, 3.2], target: [0, 0.02, -5.2], fov: 45 },
  idle: { position: [0, 0.3, 7.8], target: [0, -0.8, -8.5], fov: 42 },
};

export const CAMERA_CONVERGENCE: Record<CameraPhaseKey, CameraConvergenceSpec> = {
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

export function resolveCameraPose(phase: CameraPhaseKey): CameraPose {
  return CAMERA_POSES[phase] ?? CAMERA_POSES.HOME;
}

export function resolveCameraConvergence(
  phase: CameraPhaseKey,
): CameraConvergenceSpec {
  return CAMERA_CONVERGENCE[phase] ?? CAMERA_CONVERGENCE.HOME;
}
