import { useEffect, useMemo, useRef } from "react";
import { loadUraiSnapshot, saveUraiSnapshot } from "@/lib/uraiPersistence/localStore";
import { resolveLegacyOwnerId } from "@/lib/uraiStorage/ownerScope";
import type { UraiPersistenceSnapshot } from "@/lib/uraiPersistence/types";

type UseUraiPersistenceArgs = {
  snapshot: UraiPersistenceSnapshot;
  // Caller must supply a verified owner and explicitly opt in. This hook
  // does not authenticate an ID or grant consent for private cloud data.
  ownerId?: string | null;
  enabled?: boolean;
  debounceMs?: number;
};

export function useUraiPersistence({
  snapshot,
  ownerId = null,
  enabled = false,
  debounceMs = 450,
}: UseUraiPersistenceArgs) {
  const activeOwnerId = enabled ? resolveLegacyOwnerId(ownerId) : null;
  const scopeRef = useRef({ ownerId: activeOwnerId, epoch: 0 });
  if (scopeRef.current.ownerId !== activeOwnerId) {
    scopeRef.current = { ownerId: activeOwnerId, epoch: scopeRef.current.epoch + 1 };
  }
  const epoch = scopeRef.current.epoch;

  // Read only an explicitly selected owner's partition. Never hydrate an
  // unattributed historical record or expose the previous owner's state.
  const hydratedSnapshot = useMemo(
    () => activeOwnerId ? loadUraiSnapshot(activeOwnerId) : null,
    [activeOwnerId, epoch]
  );
  const lastSavedRef = useRef({ epoch: -1, key: "" });
  const stableKey = JSON.stringify(snapshot);

  useEffect(() => {
    if (!activeOwnerId) return;
    if (lastSavedRef.current.epoch === epoch && lastSavedRef.current.key === stableKey) return;

    const timer = window.setTimeout(() => {
      // React cleanup may not have run yet when logout/account-switch occurs.
      if (scopeRef.current.ownerId !== activeOwnerId || scopeRef.current.epoch !== epoch) return;
      saveUraiSnapshot(snapshot, activeOwnerId);
      lastSavedRef.current = { epoch, key: stableKey };
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [activeOwnerId, epoch, stableKey, snapshot, debounceMs]);

  return { hydratedSnapshot };
}
