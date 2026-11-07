import type { UraiPersistenceSnapshot } from "./types";
import { legacyOwnerStorageKey } from "@/lib/uraiStorage/ownerScope";

const NAMESPACE = "urai:tier7:persistence";
// The historical unscoped key remains untouched but is never read or migrated
// automatically. An authenticated, consented migration needs separate review.

export function saveUraiSnapshot(
  snapshot: UraiPersistenceSnapshot,
  ownerId: string | null | undefined
): void {
  const key = legacyOwnerStorageKey(NAMESPACE, ownerId);
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // persistence must never break Spatial
  }
}

export function loadUraiSnapshot(ownerId: string | null | undefined): UraiPersistenceSnapshot | null {
  const key = legacyOwnerStorageKey(NAMESPACE, ownerId);
  if (!key || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as UraiPersistenceSnapshot;
  } catch {
    return null;
  }
}

export function clearUraiSnapshot(ownerId: string | null | undefined): void {
  const key = legacyOwnerStorageKey(NAMESPACE, ownerId);
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}
