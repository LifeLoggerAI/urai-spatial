import type { Phase } from "@/lib/uraiCanon";
import type { EmotionalTone, SymbolicWeight } from "@/spatial/emotion/types";

export interface SpatialStorySnapshot {
  memoryId: string;
  phase: Phase;
  title: string;
  tone: EmotionalTone;
  symbolicWeight: SymbolicWeight;
  narratorText?: string;
  insightText?: string;
  auraColor: string;
  replayDensity: number;
  createdAt: string;
}
