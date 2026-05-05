export type SpatialPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);

export function backPhase(current: SpatialPhase): SpatialPhase {
  if (current === "REPLAY") return "FOCUS";
  if (current === "FOCUS") return "LIFEMAP";
  if (current === "LIFEMAP" || current === "ASCENT") return "HOME";
  return "HOME";
}

export function canEnterReplay(phase: SpatialPhase, selectedStarId: string | null, focusReady: boolean): boolean {
  return phase === "FOCUS" && !!selectedStarId && focusReady;
}

export type GroundChannels = {
  recession: number;
  elevation: number;
  opacity: number;
};

export function getGroundChannelsForPhase(phase: string, progress = 0): GroundChannels {
  const p = easeOutCubic(progress);

  if (phase === "ASCENT") {
    return {
      recession: p * 3.2,
      elevation: p * 1.15,
      opacity: 1 - p * 0.72,
    };
  }

  if (phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY") {
    return {
      recession: 3.2,
      elevation: 1.15,
      opacity: 0.28,
    };
  }

  return {
    recession: 0,
    elevation: 0,
    opacity: 1,
  };
}
