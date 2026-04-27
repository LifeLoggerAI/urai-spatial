import { useMemo } from "react";
import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import type { NarratorLine, Insight } from "@/spatial/narrator/types";
import { createSpatialStorySnapshot } from "@/spatial/product/createSpatialStorySnapshot";

export function useSpatialStorySnapshot(args: {
  memory: SpatialMemory | null;
  emotionalState: EmotionalState;
  narratorLine?: NarratorLine | null;
  insight?: Insight | null;
}) {
  return useMemo(() => createSpatialStorySnapshot(args), [
    args.memory,
    args.emotionalState,
    args.narratorLine,
    args.insight,
  ]);
}
