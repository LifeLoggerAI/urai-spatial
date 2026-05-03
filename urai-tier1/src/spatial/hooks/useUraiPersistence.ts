import { useEffect, useMemo, useRef, useState } from "react";
import { loadUraiSnapshot, saveUraiSnapshot } from "@/lib/uraiPersistence/localStore";
import type { UraiPersistenceSnapshot } from "@/lib/uraiPersistence/types";

type UseUraiPersistenceArgs = {
  snapshot: UraiPersistenceSnapshot;
  enabled?: boolean;
  debounceMs?: number;
};

export function useUraiPersistence({
  snapshot,
  enabled = true,
  debounceMs = 450,
}: UseUraiPersistenceArgs) {
  const [hydratedSnapshot] = useState<UraiPersistenceSnapshot | null>(() => loadUraiSnapshot());
  const lastSavedRef = useRef("");

  const stableKey = useMemo(() => {
    return JSON.stringify({
      phase: snapshot.session.phase,
      selectedStarId: snapshot.session.selectedStarId,
      lastPhase: snapshot.session.lastPhase,
      replayEnteredAt: snapshot.session.replayEnteredAt,
      dominantArc: snapshot.pattern.dominantArc,
      nextSuggestedFocusId: snapshot.pattern.nextSuggestedFocusId,
      companionMode: snapshot.companion.mode,
      companionAction: snapshot.companion.suggestedAction,
      memoryCount: snapshot.memories.length,
    });
  }, [snapshot]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === stableKey) return;

    const timer = window.setTimeout(() => {
      lastSavedRef.current = stableKey;
      saveUraiSnapshot(snapshot);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [enabled, stableKey, snapshot, debounceMs]);

  return {
    hydratedSnapshot,
  };
}
