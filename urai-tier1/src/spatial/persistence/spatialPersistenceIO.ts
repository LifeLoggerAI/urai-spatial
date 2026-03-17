import {
  SPATIAL_PERSISTENCE_STORAGE_KEY,
  type SpatialPersistenceSnapshot,
} from "@/spatial/persistence/spatialPersistenceTypes";

export function writeSpatialPersistenceSnapshot(
  snapshot: SpatialPersistenceSnapshot,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SPATIAL_PERSISTENCE_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch (_err) {}
}

export function readSpatialPersistenceSnapshot():
  | SpatialPersistenceSnapshot
  | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SPATIAL_PERSISTENCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpatialPersistenceSnapshot;
    if (parsed?.schema !== "urai.spatial.persistence.v1") return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}
