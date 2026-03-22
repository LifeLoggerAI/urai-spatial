export type SpatialCompareEntry = {
  id: string;
  label: string;
  savedAt: string;
};

export type SpatialCompareSummary = {
  sceneModeChanged?: boolean;
  selectedStarChanged?: boolean;
  locomotionDistance?: number;
  baselineSavedAt?: string;
};

export type SpatialCompareSet = {
  id: string;
  label: string;
  createdAt: string;

  baseline?: SpatialCompareEntry;
  target?: SpatialCompareEntry;

  summary: SpatialCompareSummary;
};

export type SpatialCompareManifest = {
  schema: "urai.spatial.compare.v1";
  sets: SpatialCompareSet[];
};

export const SPATIAL_COMPARE_STORAGE_KEY = "urai_compare_manifest";
export const SPATIAL_COMPARE_MAX_SETS = 24;

export function createDefaultSpatialCompareManifest(): SpatialCompareManifest {
  return {
    schema: "urai.spatial.compare.v1",
    sets: [],
  };
}
