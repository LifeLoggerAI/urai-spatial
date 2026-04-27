import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import type { Insight } from "./types";

export function createInsight(memory: SpatialMemory | null, emotional: EmotionalState): Insight | null {
  if (!memory) return null;

  const meaning =
    memory.kind === "threshold" ? "This moment changed the shape of the path." :
    memory.kind === "recovery" ? "This is a return point." :
    memory.kind === "wound" ? "This memory carries unresolved weight." :
    memory.kind === "milestone" ? "This marks visible movement." :
    memory.kind === "relationship" ? "This point is connected to another person in the field." :
    memory.kind === "dream" ? "This memory behaves like symbolic residue." :
    emotional.symbolicWeight === "heavy" ? "This moment still has gravity." :
    "This point belongs to the larger pattern.";

  return {
    id: `insight:${memory.id}:${emotional.tone}:${emotional.symbolicWeight}`,
    memoryId: memory.id,
    title: memory.title,
    meaning,
    emotionalTone: emotional.tone,
    symbolicWeight: emotional.symbolicWeight,
    generatedAt: new Date().toISOString(),
  };
}
