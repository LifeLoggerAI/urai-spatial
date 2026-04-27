import { useMemo } from "react";
import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import type { Insight } from "@/spatial/narrator/types";
import { createInsight } from "@/spatial/narrator/insightRules";

export function useSpatialInsights(
  activeMemory: SpatialMemory | null,
  emotionalState: EmotionalState
): Insight | null {
  return useMemo(() => {
    if (emotionalState.phase !== "FOCUS" && emotionalState.phase !== "REPLAY") {
      return null;
    }
    return createInsight(activeMemory, emotionalState);
  }, [activeMemory, emotionalState]);
}
