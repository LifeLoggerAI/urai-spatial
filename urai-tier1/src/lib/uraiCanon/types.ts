export type Phase =
| "HOME"
| "ASCENT"
| "LIFEMAP"
| "FOCUS"
| "REPLAY";

export type Mode = Phase;
export type UraiPhase = Phase;
export type ScenePhase =
| Phase
| "OPEN_REPLAY"
| "CLOSE_REPLAY"
| "DESCENT"
| "EXIT_FOCUS"
| "EXIT_REPLAY"
| "idle"
| string;

export type CanonState = {
phase: Phase;
selectedStarId: string | null;
transitionToken: number;
illegalCount: number;
dwellUntil: number;
enteredAt: number;
};

export type CanonAction =
| { type: "BEGIN_ASCENT" }
| { type: "ARRIVE_LIFEMAP" }
| { type: "OPEN_FOCUS"; starId?: string | null }
| { type: "OPEN_REPLAY" }
| { type: "CLOSE_REPLAY" }
| { type: "CLOSE_FOCUS" }
| { type: "GO_HOME" };

export type UraiCommand =
| "BEGIN_ASCENT"
| "ARRIVE_LIFEMAP"
| "OPEN_FOCUS"
| "OPEN_REPLAY"
| "CLOSE_REPLAY"
| "CLOSE_FOCUS"
| "GO_HOME"
| "RESET"
| "ESC"
| string;

export type Vec3 = [number, number, number];

export type CameraPose = {
position?: Vec3 | number[] | { x?: number; y?: number; z?: number };
target?: Vec3 | number[] | { x?: number; y?: number; z?: number };
rotation?: Vec3 | number[] | { x?: number; y?: number; z?: number };
rotationX?: number;
rotationY?: number;
rotationZ?: number;
zoom?: number;
fov?: number;
[key: string]: unknown;
};

export type CameraConvergenceSpec = {
pose?: CameraPose;
from?: CameraPose;
to?: CameraPose;
durationMs?: number;
damping?: number;
easing?: string;
phase?: ScenePhase;
locked?: boolean;
[key: string]: unknown;
};

export type CanonLockState = {
locked?: boolean;
label?: string;
status?: string;
[key: string]: unknown;
};

export type CanonTierLock = {
id?: string;
label?: string;
locked?: boolean;
completed?: boolean;
status?: string;
[key: string]: unknown;
};

export type MemoryWeight = {
emotionalWeight?: number;
intensity?: number;
recovery?: number;
[key: string]: unknown;
};

export type NarratorCue = {
headline?: string;
body?: string;
actionLabel?: string;
tone?: string;
[key: string]: unknown;
};

export type UraiState = {
mode?: UraiPhase;
phase: UraiPhase;
selectedStarId: string | null;
transitionToken: number;
inputLocked: boolean;
enteredAt: number;
dwellUntil: number;
isTransitioning: boolean;
transitioning: boolean;
transitionLock: boolean;
transitionState: string;
[key: string]: unknown;
};

export type UraiRuntimeState = {
mode?: Mode;
phase?: Phase;
selectedStarId?: string | null;
transitionToken?: number;
illegalCount?: number;
dwellUntil?: number;
enteredAt?: number;
inputLocked?: boolean;
isTransitioning?: boolean;
transitioning?: boolean;
transitionLock?: boolean;
transitionState?: string;
[key: string]: unknown;
};

export type NarratorPhase =
  | Phase
  | Mode
  | "HOME"
  | "ASCENT"
  | "LIFEMAP"
  | "FOCUS"
  | "REPLAY"
  | "home"
  | "ascent"
  | "lifemap"
  | "focus"
  | "replay"
  | "idle"
  | string;
