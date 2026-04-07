import type { SpatialPersistenceSnapshot } from "../types";

const SPATIAL_PERSISTENCE_KEY = "urai.spatial.persistence.v1";

export function saveSpatialPersistenceSnapshot(snapshot: SpatialPersistenceSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SPATIAL_PERSISTENCE_KEY,
      JSON.stringify(snapshot),
    );
  } catch (_err) {}
}

export function loadSpatialPersistenceSnapshot(): SpatialPersistenceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPATIAL_PERSISTENCE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpatialPersistenceSnapshot;
  } catch (_err) {
    return null;
  }
}

export function clearSpatialPersistenceSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SPATIAL_PERSISTENCE_KEY);
  } catch (_err) {}
}
