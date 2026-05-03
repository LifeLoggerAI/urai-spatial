"use client";

import { usePhaseNarrator } from "./usePhaseNarrator";
import type { EmotionalState } from "./narratorTypes";

type Props = {
  phase: string;
  selectedMemoryTitle?: string | null;
  emotionalState?: Partial<EmotionalState>;
};

export function PhaseNarratorBridge({ phase, selectedMemoryTitle, emotionalState }: Props) {
  usePhaseNarrator({ phase, selectedMemoryTitle, emotionalState });
  return null;
}
