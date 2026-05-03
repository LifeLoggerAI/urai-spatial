export type Mode = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type Phase = Mode;
export type CanonPhase = Mode;
export type UraiPhase = Mode;
export type ScenePhase = Mode;
export type NarratorPhase = Mode;

export type TransitionStateName =
  | "idle"
  | "forward"
  | "reverse"
  | "open_replay"
  | "close_replay"
  | "open_focus"
  | "close_focus"
  | "open_lifemap"
  | "go_home";

export type TransitionState = TransitionStateName;

export type Vec3 = [number, number, number];

export type StarPoint = {
  id: string;
  position: Vec3;
  label?: string;
  title?: string;
  color?: string;
  intensity?: number;
  size?: number;
};

export type CameraPose = {
  position: Vec3;
  target: Vec3;
  fov?: number;
};

export type CameraConvergenceSpec = {
  pose: CameraPose;
  durationMs: number;
  damping?: number;
  ease?: "linear" | "easeInOut" | "easeOut" | "smootherstep";
};

export type TransitionSpec = {
  from: UraiPhase;
  to: UraiPhase;
  durationMs: number;
  state: TransitionStateName;
};

export type UraiState = {
  mode: Mode;
  phase: UraiPhase;
  selectedStarId: string | null;
  transitionToken: number;
  enteredAt: number;
  dwellUntil: number;
  isTransitioning: boolean;
  transitioning: boolean;
  transitionLock: boolean;
  transitionState: TransitionStateName;
  inputLocked: boolean;
};

export type UraiRuntimeState = UraiState;

export type UraiCommand =
  | { type: "GO_HOME" }
  | { type: "START_ASCENT" }
  | { type: "ENTER_LIFEMAP" }
  | { type: "OPEN_FOCUS"; starId: string }
  | { type: "OPEN_REPLAY"; starId?: string | null }
  | { type: "CLOSE_REPLAY" }
  | { type: "ESCAPE" };

export type CanonAction = UraiCommand;

export const PHASES = ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"] as const;
export const SCENE_PHASES = PHASES;

export const PHASE_TO_MODE: Record<UraiPhase, Mode> = {
  HOME: "HOME",
  ASCENT: "ASCENT",
  LIFEMAP: "LIFEMAP",
  FOCUS: "FOCUS",
  REPLAY: "REPLAY",
};

export const MODE_TO_PHASE: Record<Mode, UraiPhase> = {
  HOME: "HOME",
  ASCENT: "ASCENT",
  LIFEMAP: "LIFEMAP",
  FOCUS: "FOCUS",
  REPLAY: "REPLAY",
};

export const LEGAL_TRANSITIONS: Record<UraiPhase, readonly UraiPhase[]> = {
  HOME: ["ASCENT"],
  ASCENT: ["LIFEMAP"],
  LIFEMAP: ["FOCUS", "HOME"],
  FOCUS: ["REPLAY", "LIFEMAP"],
  REPLAY: ["FOCUS"],
};

export function canTransition(from: UraiPhase, to: UraiPhase): boolean {
  const list = LEGAL_TRANSITIONS[from] || [];
  return list.includes(to);
}

export function assertLegalTransition(from: UraiPhase, to: UraiPhase): boolean {
  if (!canTransition(from, to)) {
    throw new Error("[URAI_CANON] illegal transition " + from + " -> " + to);
  }
  return true;
}

export function resolveTransitionDuration(from: UraiPhase, to: UraiPhase): number {
  if (from === "HOME" && to === "ASCENT") return 1800;
  if (from === "ASCENT" && to === "LIFEMAP") return 1500;
  if (from === "LIFEMAP" && to === "FOCUS") return 950;
  if (from === "FOCUS" && to === "REPLAY") return 1250;
  if (from === "REPLAY" && to === "FOCUS") return 1100;
  if (from === "FOCUS" && to === "LIFEMAP") return 900;
  if (from === "LIFEMAP" && to === "HOME") return 1400;
  return 1000;
}
