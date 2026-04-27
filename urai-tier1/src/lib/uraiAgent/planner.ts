import type { EmotionalState, Phase } from "@/lib/uraiEmotion/types";
import type { PatternInsight } from "@/lib/uraiPatterns/types";
import type { AgentSuggestion } from "./types";

export function planCompanionSuggestion(input: {
  userId?: string;
  phase: Phase;
  emotionalState: EmotionalState;
  activePatterns?: PatternInsight[];
  now?: number;
}): AgentSuggestion | null {
  const now = input.now ?? Date.now();
  const patterns = input.activePatterns ?? [];
  const severe = patterns.find((p) => p.severity > 0.7 && p.confidence > 0.6);

  if (input.phase === "ASCENT") return null;

  if (severe) {
    return {
      id: `agent_${now}`,
      userId: input.userId,
      type: "reflection",
      text: `This pattern is active: ${severe.label}.`,
      priority: severe.severity > 0.85 ? "high" : "medium",
      reason: severe.description,
      patternIds: [severe.id],
      memoryIds: severe.memoryIds,
      createdAt: now,
      expiresAt: now + 21600000,
      deliverySurface: "narrator",
    };
  }

  if (input.emotionalState.arousal > 0.82 && input.emotionalState.clarity < 0.35) {
    return {
      id: `agent_${now}`,
      userId: input.userId,
      type: "stabilization",
      text: "The system is detecting overload. Lower stimulation is the safest next move.",
      priority: "high",
      reason: "High arousal with low clarity.",
      patternIds: [],
      memoryIds: [],
      createdAt: now,
      expiresAt: now + 10800000,
      deliverySurface: "narrator",
    };
  }

  return null;
}
