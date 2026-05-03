import type { CanonPhase, Mode, UraiRuntimeState } from "./types";

export const INITIAL_STATE: UraiRuntimeState = {
phase: "HOME",
mode: "HOME",
selectedStarId: null,
enteredAt: Date.now(),
dwellUntil: 0,
inputLocked: false,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};

export const INITIAL_CANON_STATE = INITIAL_STATE;
export const INITIAL_URAI_RUNTIME_STATE = INITIAL_STATE;

export function normalizeToPhase(value: unknown, fallback: CanonPhase = "HOME"): CanonPhase {
if (value === "HOME" || value === "ASCENT" || value === "LIFEMAP" || value === "FOCUS" || value === "REPLAY") {
return value;
}
return fallback;
}

export function normalizeToUraiPhase(value: unknown, fallback: CanonPhase = "HOME"): CanonPhase {
return normalizeToPhase(value, fallback);
}

export function coerceUraiPhase(value: unknown, fallback: CanonPhase = "HOME"): CanonPhase {
return normalizeToPhase(value, fallback);
}

export function normalizeToMode(value: unknown, fallback: Mode = "HOME"): Mode {
return normalizeToPhase(value, fallback);
}

export function phaseToMode(phase: CanonPhase): Mode {
return phase;
}

export function modeToPhase(mode: Mode): CanonPhase {
return mode;
}

export function canTransition(from: CanonPhase, to: CanonPhase): boolean {
return (
(from === "HOME" && to === "ASCENT") ||
(from === "ASCENT" && to === "LIFEMAP") ||
(from === "LIFEMAP" && to === "FOCUS") ||
(from === "FOCUS" && to === "REPLAY") ||
(from === "REPLAY" && to === "FOCUS") ||
(from === "FOCUS" && to === "LIFEMAP") ||
(from === "LIFEMAP" && to === "HOME")
);
}

export function assertLegalTransition(from: CanonPhase, to: CanonPhase): true {
if (!canTransition(from, to)) {
throw new Error("Illegal transition: " + from + " -> " + to);
}
return true;
}

export function resolveEscTarget(phase: CanonPhase): CanonPhase {
if (phase === "REPLAY") return "FOCUS";
if (phase === "FOCUS") return "LIFEMAP";
if (phase === "LIFEMAP") return "HOME";
return phase;
}

export function normalizeRuntimeState(input: Partial<UraiRuntimeState> | null | undefined): UraiRuntimeState {
const phase = normalizeToPhase(input?.phase, "HOME");
const transitionState = input?.transitionState;
return {
phase,
mode: normalizeToMode(input?.mode ?? phase, phase),
selectedStarId: typeof input?.selectedStarId === "string" ? input.selectedStarId : null,
enteredAt: typeof input?.enteredAt === "number" ? input.enteredAt : Date.now(),
dwellUntil: typeof input?.dwellUntil === "number" ? input.dwellUntil : 0,
inputLocked: Boolean(input?.inputLocked),
isTransitioning: Boolean(input?.isTransitioning),
transitioning: Boolean(input?.transitioning),
transitionLock: Boolean(input?.transitionLock),
transitionState:
transitionState === "open_replay" ||
transitionState === "close_replay" ||
transitionState === "open_focus" ||
transitionState === "close_focus" ||
transitionState === "open_lifemap" ||
transitionState === "close_lifemap" ||
transitionState === "open_ascent" ||
transitionState === "close_ascent"
? transitionState
: "idle",
};
}

export function normalizeCanonState(input: Partial<UraiRuntimeState> | null | undefined): UraiRuntimeState {
return normalizeRuntimeState(input);
}

export function createInitialRuntimeState(): UraiRuntimeState {
return normalizeRuntimeState(INITIAL_STATE);
}
