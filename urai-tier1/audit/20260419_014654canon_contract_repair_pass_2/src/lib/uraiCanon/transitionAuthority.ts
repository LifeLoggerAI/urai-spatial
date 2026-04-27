/* URAI_CANON_COMPAT_TRANSITION_AUTHORITY_V1 */
import type { Phase, UraiPhase } from "./types";
import {
assertLegalTransition,
modeToPhase,
normalizeToMode,
normalizeToPhase,
phaseToMode,
resolveEscTarget,
} from "./state";

export function resolveTransitionPhaseName(value: unknown): UraiPhase {
return normalizeToPhase(String(value));
}

export function canTransition(fromValue: unknown, toValue: unknown): boolean {
try {
return assertLegalTransition(
normalizeToMode(String(fromValue)),
normalizeToMode(String(toValue)),
);
} catch {
return false;
}
}

export function getNextPhase(fromValue: unknown, toValue: unknown): UraiPhase {
const fromMode = normalizeToMode(String(fromValue));
const toMode = normalizeToMode(String(toValue));

try {
assertLegalTransition(fromMode, toMode);
return modeToPhase(toMode);
} catch {
return modeToPhase(fromMode);
}
}

export function getEscPhase(fromPhase: Phase | UraiPhase): UraiPhase {
return modeToPhase(resolveEscTarget(phaseToMode(fromPhase)));
}
