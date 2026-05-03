export type Mode = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type ScenePhase =
  | Mode
  | "OPEN_REPLAY"
  | "CLOSE_REPLAY"
  | "DESCENT"
  | "EXIT_FOCUS"
  | "EXIT_REPLAY"
  | "idle";

export type Phase = ScenePhase;
export type UraiPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type Tier1Mode = Mode;
export type NarratorPhase = ScenePhase;
export type TransitionPhase = ScenePhase;
export type TransitionState = "idle" | "transitioning";

export type CameraVec3 = [number, number, number];

export type CameraPose = {
  position: CameraVec3;
  target: CameraVec3;
  fov: number;
};

export type CameraConvergenceSpec = {
  pose: CameraPose;
  durationMs: number;
  damping: number;
};

export type PerformanceBudget = {
  maxStars: number;
};

export type TransitionSpec = {
  durationMs: number;
  damping: number;
  inputLocked?: boolean;
};

export type LockWindowSpec = {
  lockMs: number;
  releaseMs: number;
};

export type UraiCommand =
  | { type: "GO_HOME" }
  | { type: "START_ASCENT" }
  | { type: "ARRIVE_LIFEMAP" }
  | { type: "OPEN_FOCUS"; starId: string }
  | { type: "OPEN_REPLAY"; starId?: string | null }
  | { type: "CLOSE_REPLAY" }
  | { type: "ESCAPE" };

export type CanonAction = UraiCommand;

export type CanonState = {
  mode: Mode;
  selectedStarId: string | null;
  transitionToken: number;
};

export type UraiRuntimeState = {
  mode: Mode;
  phase: ScenePhase;
  selectedStarId: string | null;
  transitionToken: number;
  inputLocked: boolean;
  isTransitioning: boolean;
  transitioning: boolean;
  transitionLock: boolean;
  transitionState: TransitionState;
};

export type UraiState = UraiRuntimeState;

export const INITIAL_CANON_STATE: CanonState = {
  mode: "HOME",
  selectedStarId: null,
  transitionToken: 0,
};

export const INITIAL_URAI_RUNTIME_STATE: UraiRuntimeState = {
  mode: "HOME",
  phase: "HOME",
  selectedStarId: null,
  transitionToken: 0,
  inputLocked: false,
  isTransitioning: false,
  transitioning: false,
  transitionLock: false,
  transitionState: "idle",
};

export type TransitionName = TransitionPhase;
export type RuntimeState = UraiRuntimeState;

export const CANON_MODES = ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"] as const;
export const CANON_PHASES = [
  "HOME",
  "ASCENT",
  "LIFEMAP",
  "FOCUS",
  "REPLAY",
  "OPEN_REPLAY",
  "CLOSE_REPLAY",
  "DESCENT",
  "EXIT_FOCUS",
  "EXIT_REPLAY",
  "idle",
] as const;
export const TRANSITION_NAMES = CANON_PHASES;

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (CANON_MODES as readonly string[]).includes(value);
}

export function isPhase(value: unknown): value is Phase {
  return typeof value === "string" && (CANON_PHASES as readonly string[]).includes(value);
}

export function isTransitionName(value: unknown): value is TransitionName {
  return typeof value === "string" && (TRANSITION_NAMES as readonly string[]).includes(value);
}

export function modeToPhase(mode: Mode): Phase {
  return mode;
}

export function phaseToMode(phase: Phase): Mode {
  if (phase === "HOME" || phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY") {
    return phase;
  }
  if (phase === "OPEN_REPLAY" || phase === "CLOSE_REPLAY" || phase === "EXIT_REPLAY") return "REPLAY";
  if (phase === "EXIT_FOCUS") return "FOCUS";
  if (phase === "DESCENT") return "LIFEMAP";
  return "HOME";
}

