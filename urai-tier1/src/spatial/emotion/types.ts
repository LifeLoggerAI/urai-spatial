import type { Phase } from "@/lib/uraiCanon";

export type EmotionalTone =
  | "neutral"
  | "calm"
  | "charged"
  | "grief"
  | "hope"
  | "tension"
  | "awe"
  | "recovery";

export type SymbolicWeight =
  | "light"
  | "medium"
  | "heavy"
  | "threshold";

export type MemoryKind =
  | "ordinary"
  | "milestone"
  | "wound"
  | "recovery"
  | "relationship"
  | "dream"
  | "threshold";

export interface SpatialMemory {
  id: string;
  title: string;
  kind: MemoryKind;
  tone: EmotionalTone;
  symbolicWeight: SymbolicWeight;
  timestamp?: string;
  auraColor: string;
  intensity: number;
  replayDensity: number;
  narratorSeed?: string;
}

export interface EmotionalState {
  phase: Phase;
  activeMemoryId: string | null;
  tone: EmotionalTone;
  symbolicWeight: SymbolicWeight;
  auraColor: string;
  auraIntensity: number;
  breathRate: number;
  replayDensity: number;
  focusPresence: number;
}
