export type SpatialPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export function backPhase(current: SpatialPhase): SpatialPhase {
  if (current === "REPLAY") return "FOCUS";
  if (current === "FOCUS") return "LIFEMAP";
  if (current === "LIFEMAP" || current === "ASCENT") return "HOME";
  return "HOME";
}

export function canEnterReplay(phase: SpatialPhase, selectedStarId: string | null, focusReady: boolean): boolean {
  return phase === "FOCUS" && !!selectedStarId && focusReady;
}
