import type {
  CameraConvergenceSpec,
  CameraPose,
  PerformanceBudget,
  UraiPhase,
} from './types'

export const TIER1_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxStars: 3000,
  maxParticles: 800,
  lodBias: 1,
}

const CAMERA_PRESETS: Record<UraiPhase, CameraPose> = {
  HOME: { position: [0, 1.6, 10], target: [0, 1.1, 0], fov: 42 },
  ASCENT: { position: [0, 5.5, 16], target: [0, 3.0, 0], fov: 48 },
  LIFEMAP: { position: [0, 0, 22], target: [0, 0, 0], fov: 52 },
  FOCUS: { position: [0, 0.4, 9], target: [0, 0, 0], fov: 38 },
  REPLAY: { position: [0, 0.2, 5.8], target: [0, 0, 0], fov: 32 },
}

const CONVERGENCE: Record<UraiPhase, CameraConvergenceSpec> = {
  HOME: { durationMs: 850, damping: 5.0 },
  ASCENT: { durationMs: 2200, damping: 5.8 },
  LIFEMAP: { durationMs: 1200, damping: 5.2 },
  FOCUS: { durationMs: 950, damping: 5.0 },
  REPLAY: { durationMs: 1350, damping: 4.8 },
}

export function tier1CameraPreset(phase: UraiPhase): CameraPose {
  return CAMERA_PRESETS[phase]
}

export function resolveCameraConvergence(phase: UraiPhase): CameraConvergenceSpec {
  return CONVERGENCE[phase]
}

export function resolveCameraDamping(phase: UraiPhase): number {
  return CONVERGENCE[phase].damping ?? 5
}
