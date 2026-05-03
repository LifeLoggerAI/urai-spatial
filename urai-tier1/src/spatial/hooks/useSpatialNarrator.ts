import { useEffect, useMemo, useRef, useState } from "react";
import type { Phase } from "@/lib/uraiCanon";
import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import type { NarratorLine } from "@/spatial/narrator/types";
import { createNarratorLine } from "@/spatial/narrator/narratorRules";

type Args = {
  phase: Phase;
  emotionalState: EmotionalState;
  activeMemory: SpatialMemory | null;
};

export function useSpatialNarrator({
  phase,
  emotionalState,
  activeMemory,
}: Args): NarratorLine | null {
  const previousPhaseRef = useRef<Phase | null>(null);
  const lastLineIdRef = useRef<string | null>(null);
  const [line, setLine] = useState<NarratorLine | null>(null);

  const candidate = useMemo(() => {
    return createNarratorLine({
      phase,
      previousPhase: previousPhaseRef.current,
      memory: activeMemory,
      emotional: emotionalState,
    });
  }, [phase, activeMemory, emotionalState]);

  useEffect(() => {
    previousPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!candidate) return;
    if (candidate.id === lastLineIdRef.current) return;

    lastLineIdRef.current = candidate.id;
    const t = window.setTimeout(() => setLine(candidate), candidate.delayMs);
    const c = window.setTimeout(() => {
      setLine((current) => current?.id === candidate.id ? null : current);
    }, candidate.delayMs + candidate.durationMs);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(c);
    };
  }, [candidate]);

  return line;
}
