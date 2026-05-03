import { useMemo } from "react";
import type { Phase } from "@/lib/uraiCanon";
import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import { memoryFromUnknown } from "@/spatial/emotion/memorySeeds";

type Args = {
  phase: Phase;
  activeMemory?: SpatialMemory | unknown | null;
  transitionProgress?: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function useEmotionalState({
  phase,
  activeMemory,
  transitionProgress = 1,
}: Args): EmotionalState {
  return useMemo(() => {
    const memory = activeMemory ? memoryFromUnknown(activeMemory) : null;
    const progress = clamp01(transitionProgress);

    const baseIntensity = memory?.intensity ?? 0.38;
    const phaseBoost =
      phase === "REPLAY" ? 1.24 :
      phase === "FOCUS" ? 1.08 :
      phase === "LIFEMAP" ? 0.72 :
      phase === "ASCENT" ? 0.32 :
      0.22;

    const focusPresence =
      phase === "FOCUS" ? clamp01(0.55 + baseIntensity * 0.45) :
      phase === "REPLAY" ? clamp01(0.72 + baseIntensity * 0.28) :
      phase === "LIFEMAP" ? 0.28 :
      0.12;

    const replayDensity =
      phase === "REPLAY"
        ? clamp01((memory?.replayDensity ?? 0.45) * 1.08)
        : clamp01((memory?.replayDensity ?? 0.28) * 0.42);

    return {
      phase,
      activeMemoryId: memory?.id ?? null,
      tone: memory?.tone ?? "neutral",
      symbolicWeight: memory?.symbolicWeight ?? "light",
      auraColor: memory?.auraColor ?? "#8fb7ff",
      auraIntensity: clamp01(baseIntensity * phaseBoost * progress),
      breathRate:
        memory?.symbolicWeight === "threshold" ? 0.42 :
        memory?.symbolicWeight === "heavy" ? 0.5 :
        memory?.tone === "calm" ? 0.28 :
        0.34,
      replayDensity,
      focusPresence,
    };
  }, [phase, activeMemory, transitionProgress]);
}
