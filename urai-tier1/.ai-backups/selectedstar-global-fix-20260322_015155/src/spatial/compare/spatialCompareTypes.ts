import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

export type SpatialCompareEntry = {
  id: string;
  label: string;
  at: string;
  sceneMode: string;
  selectedStarId: string | null;
  snapshot: SpatialPersistenceSnapshot;
};

export type SpatialCompareSummary = {
  sceneModeChanged: boolean;
  selectedStarChanged: boolean;
  locomotionDistance: number;
  baselineSavedAt: string;
  targetSavedAt: string;
};

export type SpatialCompareSet = {
  id: string;
  label: string;
  createdAt: string;
  baseline: SpatialCompareEntry;
  target: SpatialCompareEntry;
  summary: SpatialCompareSummary;
};

export type SpatialCompareManifest = {
  schema: "urai.spatial.compare.v1";
  sets: SpatialCompareSet[];
};

export const SPATIAL_COMPARE_STORAGE_KEY = "urai.spatial.compare.v1";
export const SPATIAL_COMPARE_MAX_SETS = 24;

export function createDefaultSpatialCompareManifest(): SpatialCompareManifest {
  return {
    schema: "urai.spatial.compare.v1",
    sets: [],
  };
}
