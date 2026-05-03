import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import type { NarratorLine, Insight } from "@/spatial/narrator/types";
import type { SpatialStorySnapshot } from "./types";

export function createSpatialStorySnapshot(args: {
  memory: SpatialMemory | null;
  emotionalState: EmotionalState;
  narratorLine?: NarratorLine | null;
  insight?: Insight | null;
}): SpatialStorySnapshot | null {
  const { memory, emotionalState, narratorLine, insight } = args;
  if (!memory) return null;

  return {
    memoryId: memory.id,
    phase: emotionalState.phase,
    title: memory.title,
    tone: emotionalState.tone,
    symbolicWeight: emotionalState.symbolicWeight,
    narratorText: narratorLine?.text,
    insightText: insight?.meaning,
    auraColor: emotionalState.auraColor,
    replayDensity: emotionalState.replayDensity,
    createdAt: new Date().toISOString(),
  };
}
