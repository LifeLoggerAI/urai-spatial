import { useEffect, useMemo, useRef, useState } from "react";
import { loadAdaptiveProfile, saveAdaptiveProfile } from "@/lib/uraiAdaptive/localStore";
import { resolveAdaptiveOutput, updateAdaptiveProfile } from "@/lib/uraiAdaptive/profile";
import type { UraiAdaptiveOutput, UraiAdaptiveSignal } from "@/lib/uraiAdaptive/types";

type UseUraiAdaptiveLearningArgs = {
  signal: UraiAdaptiveSignal;
  enabled?: boolean;
  debounceMs?: number;
};

export function useUraiAdaptiveLearning({
  signal,
  enabled = true,
  debounceMs = 900,
}: UseUraiAdaptiveLearningArgs): UraiAdaptiveOutput {
  const [profile, setProfile] = useState(() => loadAdaptiveProfile());
  const lastKeyRef = useRef("");

  const signalKey = useMemo(() => {
    return JSON.stringify({
      phase: signal.phase,
      selectedMemoryType: signal.selectedMemoryType,
      selectedTone: signal.selectedTone,
      dominantArc: signal.dominantArc,
      companionMode: signal.companionMode,
      companionAction: signal.companionAction,
    });
  }, [signal]);

  useEffect(() => {
    if (!enabled) return;
    if (lastKeyRef.current === signalKey) return;

    const timer = window.setTimeout(() => {
      lastKeyRef.current = signalKey;

      setProfile((prev) => {
        const next = updateAdaptiveProfile(prev, signal);
        saveAdaptiveProfile(next);
        return next;
      });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [enabled, signalKey, signal, debounceMs]);

  return useMemo(() => resolveAdaptiveOutput(profile), [profile]);
}
