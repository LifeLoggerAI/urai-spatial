/* URAI_CANON_LOCK_STATE_V1 */
import {
type CanonAction,
type CanonPhase,
type UraiRuntimeState,
assertLegalTransition,
normalizeToMode,
normalizeToPhase,
phaseToMode,
} from "./types";

export const INITIAL_CANON_STATE: UraiRuntimeState = {
mode: "HOME",
phase: "HOME",
selectedStarId: null,
transitionToken: 0,
inputLocked: false,
enteredAt: 0,
dwellUntil: 0,
};

export const INITIAL_URAI_RUNTIME_STATE: UraiRuntimeState = {
...INITIAL_CANON_STATE,
};

export function normalizeRuntimeState(
input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
const phase = normalizeToPhase(input?.phase, INITIAL_URAI_RUNTIME_STATE.phase);
return {
mode: normalizeToMode(input?.mode, phaseToMode(phase)),
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
};
}

export function normalizeCanonState(
input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
return normalizeRuntimeState(input);
}

export function transitionRuntimeState(
prev: UraiRuntimeState,
nextPhase: CanonPhase,
selectedStarId?: string | null,
now: number = Date.now(),
): UraiRuntimeState {
assertLegalTransition(prev.phase, nextPhase);
const nextSelected =
typeof selectedStarId === "string"
? selectedStarId
: nextPhase === "HOME" || nextPhase === "ASCENT" || nextPhase === "LIFEMAP"
? prev.selectedStarId
: prev.selectedStarId;
return {
...prev,
mode: phaseToMode(nextPhase),
phase: nextPhase,
selectedStarId: nextPhase === "HOME" ? null : nextSelected,
transitionToken: prev.transitionToken + 1,
enteredAt: now,
dwellUntil:
nextPhase === "REPLAY"
? Math.max(prev.dwellUntil, now + 2000)
: nextPhase === "FOCUS"
? 0
: prev.dwellUntil,
};
}

export function reduceRuntimeState(
input: UraiRuntimeState,
action: CanonAction,
now: number = Date.now(),
): UraiRuntimeState {
const state = normalizeRuntimeState(input);
switch (action.type) {
case "GO_HOME":
return transitionRuntimeState(state.phase === "LIFEMAP" ? state : transitionRuntimeState(state, "LIFEMAP", state.selectedStarId, now), "HOME", null, now);
case "START_ASCENT":
return transitionRuntimeState(state, "ASCENT", state.selectedStarId, now);
case "ENTER_LIFEMAP":
return transitionRuntimeState(state, "LIFEMAP", state.selectedStarId, now);
case "OPEN_FOCUS":
return transitionRuntimeState(
{
...state,
selectedStarId: action.starId,
},
"FOCUS",
action.starId,
now,
);
case "OPEN_REPLAY":
return transitionRuntimeState(state, "REPLAY", action.starId ?? state.selectedStarId, now);
case "CLOSE_REPLAY":
return transitionRuntimeState(state, "FOCUS", state.selectedStarId, now);
case "ESCAPE":
if (state.phase === "REPLAY") return transitionRuntimeState(state, "FOCUS", state.selectedStarId, now);
if (state.phase === "FOCUS") return transitionRuntimeState(state, "LIFEMAP", state.selectedStarId, now);
if (state.phase === "LIFEMAP") return transitionRuntimeState(state, "HOME", null, now);
return state;
case "SET_PHASE":
if (state.phase !== action.phase) {
return transitionRuntimeState(state, action.phase, action.starId ?? state.selectedStarId, now);
}
return state;
default:
return state;
}
}

export function createInitialRuntimeState(): UraiRuntimeState {
return { ...INITIAL_URAI_RUNTIME_STATE, enteredAt: Date.now() };
}
