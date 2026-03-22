export type SpatialCompareSummary = {
  sceneModeChanged?: boolean;
  selectedStarChanged?: boolean;
  locomotionDistance?: number;
};

export type SpatialCompareSet = {
  id: string;
  label: string;
  createdAt: string;
  summary: SpatialCompareSummary;
};

export type SpatialCompareManifest = {
  schema: "urai.spatial.compare.manifest.v1";
  sets: SpatialCompareSet[];
};

export const SPATIAL_COMPARE_STORAGE_KEY = "urai_compare_manifest";

export function createDefaultSpatialCompareManifest(): SpatialCompareManifest {
  return {
    schema: "urai.spatial.compare.manifest.v1",
    sets: [],
  };
}
