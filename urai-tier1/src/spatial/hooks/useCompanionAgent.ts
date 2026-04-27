"use client";

import { useMemo } from "react";
import type { EmotionalState, Phase } from "@/lib/uraiEmotion/types";
import type { PatternInsight } from "@/lib/uraiPatterns/types";
import type { AgentSuggestion } from "@/lib/uraiAgent/types";
import { planCompanionSuggestion } from "@/lib/uraiAgent/planner";

export function useCompanionAgent(input: {
  userId?: string;
  phase: Phase;
  emotionalState: EmotionalState;
  activePatterns?: PatternInsight[];
}): AgentSuggestion | null {
  return useMemo(() => planCompanionSuggestion(input), [
    input.userId,
    input.phase,
    input.emotionalState,
    input.activePatterns,
  ]);
}
