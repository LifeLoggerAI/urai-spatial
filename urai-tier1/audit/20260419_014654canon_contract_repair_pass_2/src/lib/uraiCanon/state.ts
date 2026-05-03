import { UraiPhase, UraiRuntimeState, INITIAL_URAI_RUNTIME_STATE } from "./types";

export function normalizeToPhase(input: unknown, fallback: UraiPhase = "HOME"): UraiPhase {
if (typeof input === "string") {
const v = input.toUpperCase();
if (v === "HOME" || v === "ASCENT" || v === "LIFEMAP" || v === "FOCUS" || v === "REPLAY") {
return v as UraiPhase;
}
}
return fallback;
}

export function normalizeRuntimeState(
input: Partial<UraiRuntimeState> | null | undefined
): UraiRuntimeState {
const phase = normalizeToPhase(input?.phase, INITIAL_URAI_RUNTIME_STATE.phase);

return {
mode: phase,
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
};
}
