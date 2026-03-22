import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
export type SpatialPersistenceSnapshot = {
  schema: "urai.spatial.persistence.v1";
  savedAt: string;
  sceneMode: string;
  selectedStarId: string | null;
  selectedStarLabel: string | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: unknown;
  arPlacement: unknown;
  locomotion: unknown;
  starCount: number;
  headset: {
    presenting: boolean;
    hasHeadsetPose: boolean;
    selectedStarId?: string | null;
    handoffMode?: string | null;
  };
  metrics: {
    starCount: number;
  };
};

const STORAGE_KEY = "urai.spatial.persistence.snapshot";

export function writeSpatialPersistenceSnapshot(
  snapshot: SpatialPersistenceSnapshot,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
}

export function readSpatialPersistenceSnapshot(): SpatialPersistenceSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpatialPersistenceSnapshot;
  } catch {
    return null;
  }
}

export function clearSpatialPersistenceSnapshot(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
