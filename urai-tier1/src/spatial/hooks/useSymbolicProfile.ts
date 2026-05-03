"use client";

import { useMemo } from "react";
import type { EmotionalState, Phase } from "@/lib/uraiEmotion/types";
import { computeMemoryWeight } from "@/lib/uraiMemory/computeMemoryWeight";
import type { UraiMemoryEvent } from "@/lib/uraiMemory/types";
import { resolveSymbolicProfile } from "@/lib/uraiSymbolic/resolveSymbolicProfile";
import type { SymbolicVisualProfile } from "@/lib/uraiSymbolic/types";

export function useSymbolicProfile(input: {
  phase: Phase;
  emotionalState: EmotionalState;
  selectedMemory?: Partial<UraiMemoryEvent> | null;
}): SymbolicVisualProfile {
  return useMemo(() => {
    return resolveSymbolicProfile(
      input.emotionalState,
      computeMemoryWeight(input.selectedMemory),
      input.phase
    );
  }, [input.phase, input.emotionalState, input.selectedMemory]);
}
