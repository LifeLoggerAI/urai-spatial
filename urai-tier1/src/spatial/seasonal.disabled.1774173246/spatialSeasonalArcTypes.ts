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


export function createDefaultSpatialSeasonalArcManifest(): SpatialSeasonalArcManifest {
  return {
    schema: "urai.spatial.seasonal-arc.v1",
    activeSeasonalArcId: null,
    seasonalArcs: [],
  };
}
