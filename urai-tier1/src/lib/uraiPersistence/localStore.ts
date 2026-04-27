import type { UraiPersistenceSnapshot } from "./types";

const KEY = "urai:tier7:persistence:v1";

export function saveUraiSnapshot(snapshot: UraiPersistenceSnapshot): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // persistence must never break Spatial
  }
}

export function loadUraiSnapshot(): UraiPersistenceSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UraiPersistenceSnapshot;
  } catch {
    return null;
  }
}

export function clearUraiSnapshot(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
