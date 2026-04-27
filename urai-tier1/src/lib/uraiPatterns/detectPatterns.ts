import type { EmotionalState } from "@/lib/uraiEmotion/types";
import type { UraiMemoryEvent } from "@/lib/uraiMemory/types";
import type { PatternInsight } from "./types";

export function detectPatterns(input: {
  userId?: string;
  memoryEvents?: UraiMemoryEvent[];
  emotionalState: EmotionalState;
  now?: number;
}): PatternInsight[] {
  const now = input.now ?? Date.now();
  const memories = input.memoryEvents ?? [];
  const patterns: PatternInsight[] = [];

  if (input.emotionalState.arousal > 0.82 && input.emotionalState.clarity < 0.35) {
    patterns.push({
      id: `shadow_overload_${now}`,
      userId: input.userId,
      category: "shadow",
      label: "Overload Spike",
      description: "Arousal is high while clarity is low, indicating a possible overload state.",
      confidence: 0.72,
      severity: Math.min(1, input.emotionalState.arousal + (1 - input.emotionalState.clarity)) / 2,
      momentum: 0.4,
      memoryIds: memories.slice(-5).map((m) => m.id),
      firstSeenAt: now,
      lastSeenAt: now,
      recurrenceCount: 1,
      signals: ["arousal", "clarity"],
    });
  }

  if (input.emotionalState.valence < -0.55 && input.emotionalState.primary === "loneliness") {
    patterns.push({
      id: `shadow_loneliness_${now}`,
      userId: input.userId,
      category: "relationship",
      label: "Social Withdrawal Echo",
      description: "Loneliness is the dominant signal and may be connected to reduced social contact.",
      confidence: 0.68,
      severity: Math.min(1, Math.abs(input.emotionalState.valence)),
      momentum: 0.25,
      memoryIds: memories.slice(-5).map((m) => m.id),
      firstSeenAt: now,
      lastSeenAt: now,
      recurrenceCount: 1,
      signals: ["loneliness", "negative_valence"],
    });
  }

  return patterns;
}
