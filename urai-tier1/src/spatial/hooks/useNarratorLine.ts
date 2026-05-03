"use client";

import { useMemo } from "react";
import type { EmotionalState, Phase } from "@/lib/uraiEmotion/types";
import type { UraiMemoryEvent } from "@/lib/uraiMemory/types";
import type { PatternInsight } from "@/lib/uraiPatterns/types";
import type { AgentSuggestion } from "@/lib/uraiAgent/types";
import type { NarratorLine } from "@/lib/uraiNarrator/types";
import { resolveNarratorLine } from "@/lib/uraiNarrator/resolveNarratorLine";

export function useNarratorLine(input: {
  phase: Phase;
  selectedMemory?: Partial<UraiMemoryEvent> | null;
  emotionalState: EmotionalState;
  activePatterns?: PatternInsight[];
  agentSuggestion?: AgentSuggestion | null;
}): NarratorLine | null {
  return useMemo(() => resolveNarratorLine(input), [
    input.phase,
    input.selectedMemory,
    input.emotionalState,
    input.activePatterns,
    input.agentSuggestion,
  ]);
}
