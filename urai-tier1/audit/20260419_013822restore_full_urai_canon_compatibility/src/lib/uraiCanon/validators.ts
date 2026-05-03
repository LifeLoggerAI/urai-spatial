import type { UraiPhase, UraiState } from "./types";
import { normalizeToPhase } from "./state";

export function isValidPhase(value: unknown): value is UraiPhase {
  const phase = normalizeToPhase(String(value));
  return phase === "HOME" || phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY";
}

export function hasSelectedStar(state: UraiState): boolean {
  return !!state.selectedStarId;
}
