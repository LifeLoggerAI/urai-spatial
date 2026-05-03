/* URAI_CANON_COMPAT_STATE_V2 */
import type {
CanonMode,
CanonPhase,
Mode,
UraiPhase,
UraiRuntimeState,
} from "./types";
import {
LEGAL_TRANSITIONS,
MODE_TO_PHASE,
PHASE_TO_MODE,
} from "./types";

const MODE_NORMALIZATION: Record<string, Mode> = {
HOME: "HOME",
ASCENT: "ASCENT",
LIFEMAP: "LIFEMAP",
FOCUS: "FOCUS",
REPLAY: "REPLAY",
OPEN_REPLAY: "REPLAY",
CLOSE_REPLAY: "FOCUS",
DESCENT: "LIFEMAP",
EXIT_FOCUS: "LIFEMAP",
EXIT_REPLAY: "FOCUS",
IDLE: "HOME",
};

export const INITIAL_CANON_STATE: UraiRuntimeState = {
mode: "HOME",
phase: "HOME",
selectedStarId: null,
transitionToken: 0,
inputLocked: false,
enteredAt: 0,
dwellUntil: 0,
isTransitioning: false,
transitioning: false,
transitionLock: false,
transitionState: "idle",
};

export const INITIAL_URAI_RUNTIME_STATE: UraiRuntimeState = {
...INITIAL_CANON_STATE,
};

function normalizeRawMode(value: unknown, fallback: Mode = "HOME"): Mode {
const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
return MODE_NORMALIZATION[raw] ?? fallback;
}

export function normalizeToMode(value: unknown, fallback: CanonMode = "HOME"): CanonMode {
return normalizeRawMode(value, fallback);
}

export function normalizeToPhase(value: unknown, fallback: CanonPhase = "HOME"): CanonPhase {
return normalizeRawMode(value, fallback);
}

export function normalizeToUraiPhase(value: unknown, fallback: UraiPhase = "HOME"): UraiPhase {
return normalizeRawMode(value, fallback);
}

export function coerceUraiPhase(value: unknown, fallback: UraiPhase = "HOME"): UraiPhase {
return normalizeRawMode(value, fallback);
}

export function phaseToMode(phase: CanonPhase): CanonMode {
return PHASE_TO_MODE[normalizeToPhase(phase)];
}

export function modeToPhase(mode: CanonMode): CanonPhase {
return MODE_TO_PHASE[normalizeToMode(mode)];
}

export function resolveEscTarget(fromModeValue: unknown): CanonMode {
const fromMode = normalizeToMode(fromModeValue);
if (fromMode === "REPLAY") return "FOCUS";
if (fromMode === "FOCUS") return "LIFEMAP";
if (fromMode === "LIFEMAP") return "HOME";
return fromMode;
}

export function assertLegalTransition(fromValue: unknown, toValue: unknown): true {
const fromMode = normalizeToMode(fromValue);
const toMode = normalizeToMode(toValue);
if (!LEGAL_TRANSITIONS[fromMode].includes(toMode)) {
throw new Error([URAI][CANON] illegal transition ${fromMode} -> ${toMode});
}
return true;
}

export function resolveTransitionDuration(fromValue: unknown, toValue: unknown): number {
const fromMode = normalizeToMode(fromValue);
const toMode = normalizeToMode(toValue);

if (fromMode === "HOME" && toMode === "ASCENT") return 1600;
if (fromMode === "ASCENT" && toMode === "LIFEMAP") return 1200;
if (fromMode === "LIFEMAP" && toMode === "FOCUS") return 900;
if (fromMode === "FOCUS" && toMode === "REPLAY") return 1400;
if (fromMode === "REPLAY" && toMode === "FOCUS") return 1100;
if (fromMode === "FOCUS" && toMode === "LIFEMAP") return 900;
if (fromMode === "LIFEMAP" && toMode === "HOME") return 1200;
return 1000;
}

export function normalizeRuntimeState(
input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
const phase = normalizeToPhase(input?.phase, INITIAL_URAI_RUNTIME_STATE.phase);
const mode = normalizeToMode(input?.mode, phaseToMode(phase));

return {
mode,
phase,
selectedStarId: typeof input?.selectedStarId === "string" ? input.selectedStarId : null,
transitionToken:
typeof input?.transitionToken === "number"
? input.transitionToken
: INITIAL_URAI_RUNTIME_STATE.transitionToken,
inputLocked:
typeof input?.inputLocked === "boolean"
? input.inputLocked
: INITIAL_URAI_RUNTIME_STATE.inputLocked,
enteredAt: typeof input?.enteredAt === "number" ? input.enteredAt : 0,
dwellUntil: typeof input?.dwellUntil === "number" ? input.dwellUntil : 0,
isTransitioning:
typeof input?.isTransitioning === "boolean"
? input.isTransitioning
: false,
transitioning:
typeof input?.transitioning === "boolean"
? input.transitioning
: false,
transitionLock:
typeof input?.transitionLock === "boolean"
? input.transitionLock
: false,
transitionState:
input?.transitionState ?? "idle",
};
}

export function normalizeCanonState(
input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
return normalizeRuntimeState(input);
}

export function createInitialRuntimeState(): UraiRuntimeState {
return {
...INITIAL_URAI_RUNTIME_STATE,
enteredAt: Date.now(),
};
}
