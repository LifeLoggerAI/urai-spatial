export type SpatialArcKind =
  | "scene-shift"
  | "focus-drift"
  | "movement-drift"
  | "stable-return"
  | "mixed-transition";

export type SpatialNarrativeArc = {
  id: string;
  label: string;
  createdAt: string;
  kind: SpatialArcKind;
  compareSetIds: string[];
  intensity: number;
  summary: string;
};

export type SpatialArcManifest = {
  schema: "urai.spatial.arc.v1";
  activeArcId: string | null;
  arcs: SpatialNarrativeArc[];
};

export const SPATIAL_ARC_STORAGE_KEY = "urai.spatial.arc.v1";
export const SPATIAL_ARC_MAX_ITEMS = 24;

export function createDefaultSpatialArcManifest(): SpatialArcManifest {
  return {
    schema: "urai.spatial.arc.v1",
    activeArcId: null,
    arcs: [],
  };
}
