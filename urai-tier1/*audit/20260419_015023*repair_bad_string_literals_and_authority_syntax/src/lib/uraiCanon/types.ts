/* URAI_CANON_COMPAT_TYPES_V2 */

export const PHASES = ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"] as const;
export type Mode = (typeof PHASES)[number];
export type Phase = Mode;
export type UraiPhase = Mode;
export type CanonMode = Mode;
export type CanonPhase = Mode;

export const SCENE_PHASES = [
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
export type ScenePhase = (typeof SCENE_PHASES)[number];

export type NarratorPhase =
| "HOME"
| "ASCENT"
| "LIFEMAP"
| "FOCUS"
| "REPLAY"
| "TRANSITION";

export type Vec3 = [number, number, number];

export type StarPoint = {
id: string;
position: Vec3;
color?: string;
scale?: number;
label?: string;
};

export type CameraPose = {
position: Vec3;
target?: Vec3;
lookAt?: Vec3;
fov: number;
};

export type CameraConvergenceSpec = {
pose: CameraPose;
durationMs: number;
damping: number;
};

export type TransitionSpec = {
from: Mode;
to: Mode;
durationMs: number;
easing?: "linear" | "easeInOut" | "easeOut";
};

export type TransitionStateName =
| "idle"
| "transitioning"
| "open_replay"
| "close_replay"
| "descent"
| "exit_focus"
| "exit_replay";

export type UraiRuntimeState = {
mode: CanonMode;
phase: CanonPhase;
selectedStarId: string | null;
transitionToken: number;
inputLocked: boolean;
enteredAt: number;
dwellUntil: number;
isTransitioning: boolean;
transitioning: boolean;
transitionLock: boolean;
transitionState: TransitionStateName;
};

export type UraiState = UraiRuntimeState;

export type UraiCommand =
| { type: "GO_HOME" }
| { type: "START_ASCENT" }
| { type: "ENTER_LIFEMAP" }
| { type: "OPEN_FOCUS"; starId: string }
| { type: "OPEN_REPLAY"; starId?: string | null }
| { type: "CLOSE_REPLAY" }
| { type: "ESCAPE" }
| { type: "SET_PHASE"; phase: CanonPhase; starId?: string | null };

export type CanonAction = UraiCommand;

export const LEGAL_TRANSITIONS: Readonly<Record<Mode, readonly Mode[]>> = {
HOME: ["ASCENT"],
ASCENT: ["LIFEMAP"],
LIFEMAP: ["FOCUS", "HOME"],
FOCUS: ["REPLAY", "LIFEMAP"],
REPLAY: ["FOCUS"],
} as const;

export const PHASE_TO_MODE: Readonly<Record<CanonPhase, CanonMode>> = {
HOME: "HOME",
ASCENT: "ASCENT",
LIFEMAP: "LIFEMAP",
FOCUS: "FOCUS",
REPLAY: "REPLAY",
} as const;

export const MODE_TO_PHASE: Readonly<Record<CanonMode, CanonPhase>> = {
HOME: "HOME",
ASCENT: "ASCENT",
LIFEMAP: "LIFEMAP",
FOCUS: "FOCUS",
REPLAY: "REPLAY",
} as const;

export function canTransition(from: Mode, to: Mode): boolean {
return LEGAL_TRANSITIONS[from].includes(to);
}

export function assertLegalTransition(from: Mode, to: Mode): true {
if (!canTransition(from, to)) {
throw new Error([URAI][CANON] illegal transition ${from} -> ${to});
}
return true;
}

export function resolveTransitionDuration(from: Mode, to: Mode): number {
if (from === "HOME" && to === "ASCENT") return 1600;
if (from === "ASCENT" && to === "LIFEMAP") return 1200;
if (from === "LIFEMAP" && to === "FOCUS") return 900;
if (from === "FOCUS" && to === "REPLAY") return 1400;
if (from === "REPLAY" && to === "FOCUS") return 1100;
if (from === "FOCUS" && to === "LIFEMAP") return 900;
if (from === "LIFEMAP" && to === "HOME") return 1200;
return 1000;
}
