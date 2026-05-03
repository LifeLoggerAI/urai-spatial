import type {
  CanonState,
  Mode,
  Phase,
  ScenePhase,
  UraiPhase,
  UraiRuntimeState,
} from "./types";
import {
  INITIAL_CANON_STATE,
  INITIAL_URAI_RUNTIME_STATE,
} from "./types";

const CANONICAL_PHASES: readonly UraiPhase[] = [
  "HOME",
  "ASCENT",
  "LIFEMAP",
  "FOCUS",
  "REPLAY",
] as const;

export { INITIAL_CANON_STATE, INITIAL_URAI_RUNTIME_STATE };

export function isCanonicalUraiPhase(value: unknown): value is UraiPhase {
  return typeof value === "string" && (CANONICAL_PHASES as readonly string[]).includes(value);
}

export function normalizeToUraiPhase(
  value: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  if (typeof value !== "string") return fallback;

  const upper = value.toUpperCase();

  if (isCanonicalUraiPhase(upper)) {
    return upper;
  }

  switch (upper) {
    case "OPEN_REPLAY":
      return "REPLAY";
    case "CLOSE_REPLAY":
    case "EXIT_REPLAY":
      return "FOCUS";
    case "EXIT_FOCUS":
      return "LIFEMAP";
    case "DESCENT":
      return "HOME";
    case "IDLE":
      return fallback;
    default:
      return fallback;
  }
}

export function normalizeToPhase(
  value: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  return normalizeToUraiPhase(value, fallback);
}

export function normalizeToMode(
  value: unknown,
  fallback: Mode = "HOME",
): Mode {
  return normalizeToUraiPhase(value, fallback) as Mode;
}

export function phaseToMode(
  value: unknown,
  fallback: Mode = "HOME",
): Mode {
  return normalizeToMode(value, fallback);
}

export function modeToPhase(
  value: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  return normalizeToPhase(value, fallback);
}

export function coerceUraiPhase(
  value: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  return normalizeToPhase(value, fallback);
}

export function resolveEscTarget(
  fromValue: unknown,
  fallback: UraiPhase = "HOME",
): UraiPhase {
  const from = normalizeToPhase(fromValue, fallback);

  switch (from) {
    case "REPLAY":
      return "FOCUS";
    case "FOCUS":
      return "LIFEMAP";
    case "LIFEMAP":
    case "ASCENT":
      return "HOME";
    case "HOME":
    default:
      return "HOME";
  }
}

export function assertLegalTransition(
  fromValue: unknown,
  toValue: unknown,
): true {
  const from = normalizeToMode(fromValue, "HOME");
  const to = normalizeToMode(toValue, from);

  const legal: Record<Mode, readonly Mode[]> = {
    HOME: ["HOME", "ASCENT"],
    ASCENT: ["ASCENT", "LIFEMAP", "HOME"],
    LIFEMAP: ["LIFEMAP", "FOCUS", "HOME"],
    FOCUS: ["FOCUS", "REPLAY", "LIFEMAP", "HOME"],
    REPLAY: ["REPLAY", "FOCUS", "LIFEMAP", "HOME"],
  };

  if (!legal[from].includes(to)) {
    throw new Error(`[URAI][CANON] illegal transition ${from} -> ${to}`);
  }

  return true;
}

export function createInitialCanonState(): CanonState {
  return { ...INITIAL_CANON_STATE };
}

export function createInitialRuntimeState(): UraiRuntimeState {
  return { ...INITIAL_URAI_RUNTIME_STATE };
}

export function normalizeCanonState(
  input: Partial<CanonState> | null | undefined,
): CanonState {
  return {
    mode: normalizeToMode(input?.mode, INITIAL_CANON_STATE.mode),
    selectedStarId: typeof input?.selectedStarId === "string" ? input.selectedStarId : null,
    transitionToken:
      typeof input?.transitionToken === "number"
        ? input.transitionToken
        : INITIAL_CANON_STATE.transitionToken,
  };
}

export function normalizeRuntimeState(
  input: Partial<UraiRuntimeState> | null | undefined,
): UraiRuntimeState {
const phase = normalizeToPhase(input?.phase, normalizeToPhase(INITIAL_URAI_RUNTIME_STATE.phase, "HOME"));

  return {
    mode: normalizeToMode(input?.mode ?? phase, INITIAL_URAI_RUNTIME_STATE.mode),
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
      input?.transitionState === "transitioning" || input?.transitionState === "idle"
        ? input.transitionState
        : INITIAL_URAI_RUNTIME_STATE.transitionState,
  };
}

export function phaseEquals(value: unknown, expected: UraiPhase): boolean {
  return normalizeToPhase(value, expected) === expected;
}

export type { CanonState, Mode, Phase, ScenePhase, UraiPhase, UraiRuntimeState };
