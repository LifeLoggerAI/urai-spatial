import type { SpatialArcKind } from "@/spatial/arcs/spatialArcTypes";

export type SpatialSeasonName = "Winter" | "Spring" | "Summer" | "Autumn";

export type SpatialSeasonalArc = {
  id: string;
  label: string;
  createdAt: string;
  season: SpatialSeasonName;
  year: number;
  compareSetIds: string[];
  arcIds: string[];
  dominantArcKind: SpatialArcKind | "none";
  intensity: number;
  summary: string;
};

export type SpatialSeasonalArcManifest = {
  schema: "urai.spatial.seasonal-arc.v1";
  activeSeasonalArcId: string | null;
  seasonalArcs: SpatialSeasonalArc[];
};

export const SPATIAL_SEASONAL_ARC_STORAGE_KEY = "urai.spatial.seasonal-arc.v1";
export const SPATIAL_SEASONAL_ARC_MAX_ITEMS = 24;

export function createDefaultSpatialSeasonalArcManifest(): SpatialSeasonalArcManifest {
  return {
    schema: "urai.spatial.seasonal-arc.v1",
    activeSeasonalArcId: null,
    seasonalArcs: [],
  };
}
