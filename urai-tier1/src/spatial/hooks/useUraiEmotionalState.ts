"use client";

import { useMemo } from "react";
import type { CrossModalSignal, EmotionalState, Phase } from "@/lib/uraiEmotion/types";
import { resolveEmotionalState } from "@/lib/uraiEmotion/fusion";

export function useUraiEmotionalState(input: {
  phase: Phase;
  selectedMemory?: { emotionSignals?: CrossModalSignal[] } | null;
  memoryEvents?: { emotionSignals?: CrossModalSignal[] }[];
}): EmotionalState {
  return useMemo(() => {
    const signals: CrossModalSignal[] = [];

    for (const memory of input.memoryEvents ?? []) {
      if (Array.isArray(memory.emotionSignals)) signals.push(...memory.emotionSignals);
    }

    if (input.selectedMemory?.emotionSignals) signals.push(...input.selectedMemory.emotionSignals);

    if (signals.length === 0) {
      signals.push({
        source: "memory",
        emotion: input.phase === "FOCUS" || input.phase === "REPLAY" ? "awe" : "calm",
        confidence: 0.62,
        intensity: input.phase === "REPLAY" ? 0.72 : 0.45,
        timestamp: Date.now(),
        decayHalfLifeMs: 300000,
      });
    }

    return resolveEmotionalState(signals);
  }, [input.phase, input.selectedMemory, input.memoryEvents]);
}
