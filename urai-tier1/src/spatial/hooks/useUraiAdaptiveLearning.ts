import { useEffect, useMemo, useRef, useState } from "react";
import { loadAdaptiveProfile, saveAdaptiveProfile } from "@/lib/uraiAdaptive/localStore";
import { resolveLegacyOwnerId } from "@/lib/uraiStorage/ownerScope";
import { createDefaultAdaptiveProfile, resolveAdaptiveOutput, updateAdaptiveProfile } from "@/lib/uraiAdaptive/profile";
import type { UraiAdaptiveOutput, UraiAdaptiveProfile, UraiAdaptiveSignal } from "@/lib/uraiAdaptive/types";

type UseUraiAdaptiveLearningArgs = {
  signal: UraiAdaptiveSignal;
  // Caller must explicitly opt in with a verified owner; this is not consent.
  ownerId?: string | null;
  enabled?: boolean;
  debounceMs?: number;
};

type ScopedProfile = { ownerId: string | null; epoch: number; profile: UraiAdaptiveProfile };

export function useUraiAdaptiveLearning({
  signal,
  ownerId = null,
  enabled = false,
  debounceMs = 900,
}: UseUraiAdaptiveLearningArgs): UraiAdaptiveOutput {
  const activeOwnerId = enabled ? resolveLegacyOwnerId(ownerId) : null;
  const scopeRef = useRef({ ownerId: activeOwnerId, epoch: 0 });
  if (scopeRef.current.ownerId !== activeOwnerId) {
    scopeRef.current = { ownerId: activeOwnerId, epoch: scopeRef.current.epoch + 1 };
  }
  const epoch = scopeRef.current.epoch;

  const startingProfile = useMemo(
    () => activeOwnerId ? loadAdaptiveProfile(activeOwnerId) : createDefaultAdaptiveProfile(),
    [activeOwnerId, epoch]
  );
  const [stored, setStored] = useState<ScopedProfile>(() => ({
    ownerId: activeOwnerId, epoch, profile: startingProfile,
  }));
  // On the very first render of a different owner (or logout), never return
  // the prior owner's profile, even before a state-update effect commits.
  const profile = stored.ownerId === activeOwnerId && stored.epoch === epoch
    ? stored.profile : startingProfile;
  const profileRef = useRef<ScopedProfile>({ ownerId: activeOwnerId, epoch, profile });
  profileRef.current = { ownerId: activeOwnerId, epoch, profile };
  const lastKeyRef = useRef({ epoch: -1, key: "" });
  const signalKey = JSON.stringify(signal);

  useEffect(() => {
    if (!activeOwnerId) return;
    if (lastKeyRef.current.epoch === epoch && lastKeyRef.current.key === signalKey) return;

    const timer = window.setTimeout(() => {
      if (scopeRef.current.ownerId !== activeOwnerId || scopeRef.current.epoch !== epoch) return;
      const previous = profileRef.current.ownerId === activeOwnerId && profileRef.current.epoch === epoch
        ? profileRef.current.profile : loadAdaptiveProfile(activeOwnerId);
      const next = updateAdaptiveProfile(previous, signal);
      // No storage side effects inside React state updaters: Strict Mode can
      // replay them. The scope/epoch fence also rejects late callbacks.
      saveAdaptiveProfile(next, activeOwnerId);
      profileRef.current = { ownerId: activeOwnerId, epoch, profile: next };
      lastKeyRef.current = { epoch, key: signalKey };
      setStored({ ownerId: activeOwnerId, epoch, profile: next });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [activeOwnerId, epoch, signalKey, signal, debounceMs]);

  return useMemo(() => resolveAdaptiveOutput(profile), [profile]);
}
