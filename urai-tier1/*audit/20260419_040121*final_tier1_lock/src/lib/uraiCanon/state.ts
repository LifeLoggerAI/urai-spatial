import type { Mode, UraiPhase, UraiRuntimeState } from "./types";
import {
  MODE_TO_PHASE,
  PHASE_TO_MODE,
  assertLegalTransition,
} from "./types";

export const INITIAL_CANON_STATE: UraiRuntimeState = {
  mode: "HOME",
  phase: "HOME",
  selectedStarId: null,
  transitionToken: 0,
  enteredAt: Date.now(),
  dwellUntil: 0,
  isTransitioning: false,
  transitioning: false,
  transitionLock: false,
  transitionState: "idle",
  inputLocked: false,
};

export const INITIAL_URAI_RUNTIME_STATE: UraiRuntimeState = {
  ...INITIAL_CANON_STATE,
};

export function normalizeToPhase(
  input: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  const value = String(input ?? "").toUpperCase();
  if (value === "OPEN_REPLAY") return "REPLAY";
  if (value === "CLOSE_REPLAY") return "FOCUS";
  if (value === "HOME") return "HOME";
  if (value === "ASCENT") return "ASCENT";
  if (value === "LIFEMAP") return "LIFEMAP";
  if (value === "FOCUS") return "FOCUS";
  if (value === "REPLAY") return "REPLAY";
  return fallback;
}

export function normalizeToUraiPhase(
  input: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  return normalizeToPhase(input, fallback);
}

export function coerceUraiPhase(
  input: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  return normalizeToPhase(input, fallback);
}

export function normalizeToMode(
  input: unknown,
  fallback: Mode = "HOME",
): Mode {
  const phase = normalizeToPhase(input, MODE_TO_PHASE[fallback]);
  return PHASE_TO_MODE[phase];
}

export function phaseToMode(phase: UraiPhase): Mode {
  return PHASE_TO_MODE[normalizeToPhase(phase, "HOME")];
}

export function modeToPhase(mode: Mode): UraiPhase {
  return MODE_TO_PHASE[normalizeToMode(mode, "HOME")];
}

export function resolveEscTarget(phaseInput: unknown): UraiPhase {
  const phase = normalizeToPhase(phaseInput, "HOME");
  if (phase === "REPLAY") return "FOCUS";
  if (phase === "FOCUS") return "LIFEMAP";
  if (phase === "LIFEMAP") return "HOME";
  return "HOME";
}

export function createInitialRuntimeState(): UraiRuntimeState {
  return {
    ...INITIAL_URAI_RUNTIME_STATE,
    enteredAt: Date.now(),
  };
}

export function normalizeRuntimeState(
  input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
  const phase = normalizeToPhase(input?.phase, INITIAL_URAI_RUNTIME_STATE.phase);
  return {
    mode: normalizeToMode(input?.mode ?? phase, phaseToMode(phase)),
    phase,
    selectedStarId:
      typeof input?.selectedStarId === "string" ? input.selectedStarId : null,
    transitionToken:
      typeof input?.transitionToken === "number"
        ? input.transitionToken
        : INITIAL_URAI_RUNTIME_STATE.transitionToken,
    enteredAt:
      typeof input?.enteredAt === "number"
        ? input.enteredAt
        : INITIAL_URAI_RUNTIME_STATE.enteredAt,
    dwellUntil:
      typeof input?.dwellUntil === "number"
        ? input.dwellUntil
        : INITIAL_URAI_RUNTIME_STATE.dwellUntil,
    isTransitioning:
      typeof input?.isTransitioning === "boolean"
        ? input.isTransitioning
        : INITIAL_URAI_RUNTIME_STATE.isTransitioning,
    transitioning:
      typeof input?.transitioning === "boolean"
        ? input.transitioning
        : INITIAL_URAI_RUNTIME_STATE.transitioning,
    transitionLock:
      typeof input?.transitionLock === "boolean"
        ? input.transitionLock
        : INITIAL_URAI_RUNTIME_STATE.transitionLock,
    transitionState:
      typeof input?.transitionState === "string"
        ? (input.transitionState as UraiRuntimeState["transitionState"])
        : INITIAL_URAI_RUNTIME_STATE.transitionState,
    inputLocked:
      typeof input?.inputLocked === "boolean"
        ? input.inputLocked
        : INITIAL_URAI_RUNTIME_STATE.inputLocked,
  };
}

export function normalizeCanonState(
  input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
  return normalizeRuntimeState(input);
}

export { assertLegalTransition };
