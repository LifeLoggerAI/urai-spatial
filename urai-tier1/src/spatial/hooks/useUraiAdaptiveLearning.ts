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

  // Include the intensity/weight consumed by the real algorithm and the
  // timestamp distinguishing a later event with otherwise identical content.
  const signalKey = JSON.stringify(signal);

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
