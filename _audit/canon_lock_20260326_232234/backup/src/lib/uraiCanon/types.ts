export type UraiPhase = "HOME" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type TransitionState =
  | "IDLE"
  | "HOME_SETTLE"
  | "ASCENT"
  | "DESCENT"
  | "FOCUS_LOCK"
  | "FOCUS_RELEASE"
  | "REPLAY_ENTRY"
  | "REPLAY_EXIT";

export type EmotionalTone =
  | "warm"
  | "cool"
  | "neutral"
  | "grief"
  | "rupture"
  | "awe"
  | "recovery";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface StarNode {
  id: string;
  position: Vec3;
  intensity: number;
  emotionalTone: EmotionalTone;
  clusterId: string | null;
  memoryRef: string;
  isInteractive: boolean;
  stability?: number;
  label?: string;
}

export interface UraiRuntimeState {
  phase: UraiPhase;
  transition: TransitionState;
  selectedStarId: string | null;
  inputLocked: boolean;
  hoverStarId: string | null;
  replayMemoryRef: string | null;
  lastStablePhase: Exclude<UraiPhase, "REPLAY">;
}

export interface TransitionSpec {
  id: string;
  from: UraiPhase;
  to: UraiPhase;
  durationMs: number;
  lockInput: boolean;
  state: TransitionState;
  easing: "linear" | "easeInCubic" | "easeOutCubic" | "canonConvergence";
}

export interface CameraConvergenceSpec {
  durationMs: number;
  lockInPct: number;
  convergePct: number;
  compressPct: number;
  minDistanceToTarget: number;
  forbidOrbit: true;
  forbidOvershoot: true;
}

export interface PerformanceBudget {
  targetFps: number;
  maxDrawCalls: number;
  maxActiveParticles: number;
  maxBloomIntensity: number;
  maxDynamicLights: number;
}
