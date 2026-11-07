import { useEffect, useRef, useState } from "react";
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

  // A memory count or object identity cannot identify the saved content:
  // edits to existing memories, relationships and companion state matter too.
  const stableKey = JSON.stringify(snapshot);

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
