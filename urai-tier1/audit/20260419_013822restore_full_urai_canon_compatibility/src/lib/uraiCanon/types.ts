/* URAI_CANON_LOCK_TYPES_V1 */
export const PHASES = ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"] as const;
export type CanonPhase = (typeof PHASES)[number];
export type CanonMode = CanonPhase;

export type TransitionName =
| "GO_HOME"
| "START_ASCENT"
| "ENTER_LIFEMAP"
| "OPEN_FOCUS"
| "OPEN_REPLAY"
| "CLOSE_REPLAY"
| "ESCAPE"
| "SET_PHASE";

export type StarPoint = {
id: string;
position: [number, number, number];
color?: string;
scale?: number;
label?: string;
};

export type UraiRuntimeState = {
mode: CanonMode;
phase: CanonPhase;
selectedStarId: string | null;
transitionToken: number;
inputLocked: boolean;
enteredAt: number;
dwellUntil: number;
};

export const LEGAL_TRANSITIONS: Readonly<Record<CanonPhase, readonly CanonPhase[]>> = {
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

export type CanonAction =
| { type: "GO_HOME" }
| { type: "START_ASCENT" }
| { type: "ENTER_LIFEMAP" }
| { type: "OPEN_FOCUS"; starId: string }
| { type: "OPEN_REPLAY"; starId?: string | null }
| { type: "CLOSE_REPLAY" }
| { type: "ESCAPE" }
| { type: "SET_PHASE"; phase: CanonPhase; starId?: string | null };

export function normalizeToPhase(input: unknown, fallback: CanonPhase = "HOME"): CanonPhase {
const value = typeof input === "string" ? input.trim().toUpperCase() : "";
return (PHASES as readonly string[]).includes(value) ? (value as CanonPhase) : fallback;
}

export function normalizeToMode(input: unknown, fallback: CanonMode = "HOME"): CanonMode {
return normalizeToPhase(input, fallback);
}

export function phaseToMode(phase: CanonPhase): CanonMode {
return PHASE_TO_MODE[phase];
}

export function modeToPhase(mode: CanonMode): CanonPhase {
return MODE_TO_PHASE[mode];
}

export function canTransition(from: CanonPhase, to: CanonPhase): boolean {
return LEGAL_TRANSITIONS[from].includes(to);
}

export function assertLegalTransition(from: CanonPhase, to: CanonPhase): void {
if (!canTransition(from, to)) {
throw new Error(`[URAI][CANON] illegal transition ${from} -> ${to}`);
}
}

export function resolveTransitionDuration(from: CanonPhase, to: CanonPhase): number {
if (from === "HOME" && to === "ASCENT") return 1600;
if (from === "ASCENT" && to === "LIFEMAP") return 1200;
if (from === "LIFEMAP" && to === "FOCUS") return 900;
if (from === "FOCUS" && to === "REPLAY") return 1400;
if (from === "REPLAY" && to === "FOCUS") return 1100;
if (from === "FOCUS" && to === "LIFEMAP") return 900;
if (from === "LIFEMAP" && to === "HOME") return 1200;
return 1000;
}
