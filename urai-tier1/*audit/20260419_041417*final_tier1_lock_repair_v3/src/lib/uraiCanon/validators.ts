/* URAI_CANON_COMPAT_VALIDATORS_V2 */
import type { UraiPhase, UraiState } from "./types";
import { normalizeToPhase } from "./state";

export function isValidUraiPhase(value: unknown): value is UraiPhase {
const phase = normalizeToPhase(value);
return phase === "HOME" || phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY";
}

export function normalizeStatePhase(state: Partial<UraiState> | null | undefined): UraiPhase {
return normalizeToPhase(state?.phase);
}

export function assertStatePhase(state: Partial<UraiState> | null | undefined): UraiState {
return {
mode: normalizeToPhase(state?.mode),
phase: normalizeToPhase(state?.phase),
selectedStarId: typeof state?.selectedStarId === "string" ? state.selectedStarId : null,
transitionToken: typeof state?.transitionToken === "number" ? state.transitionToken : 0,
inputLocked: typeof state?.inputLocked === "boolean" ? state.inputLocked : false,
enteredAt: typeof state?.enteredAt === "number" ? state.enteredAt : 0,
dwellUntil: typeof state?.dwellUntil === "number" ? state.dwellUntil : 0,
isTransitioning: typeof state?.isTransitioning === "boolean" ? state.isTransitioning : false,
transitioning: typeof state?.transitioning === "boolean" ? state.transitioning : false,
transitionLock: typeof state?.transitionLock === "boolean" ? state.transitionLock : false,
transitionState: state?.transitionState ?? "idle",
};
}
