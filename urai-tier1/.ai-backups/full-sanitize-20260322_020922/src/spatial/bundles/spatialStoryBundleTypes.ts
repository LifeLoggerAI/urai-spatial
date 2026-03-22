import type { SpatialNarrativeArc } from "@/spatial/arcs/spatialArcTypes";
import type { SpatialCompareSet } from "@/spatial/compare/spatialCompareTypes";
import type { SpatialTimelineLens } from "@/spatial/lenses/spatialLensTypes";
import type { SpatialNarratorExport } from "@/spatial/narrator/spatialNarratorExportTypes";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import type { SpatialSeasonalArc } from "@/spatial/seasonal/spatialSeasonalArcTypes";

export type SpatialStoryBundle = {
  schema: "urai.spatial.story-bundle.v1";
  exportedAt: string;
  account: {
    id: string;
    label: string | null;
  };
  snapshot: SpatialPersistenceSnapshot;
  activeLens: SpatialTimelineLens | null;
  activeCompareSet: SpatialCompareSet | null;
  arcs: SpatialNarrativeArc[];
  seasonalArcs: SpatialSeasonalArc[];
  narrator: SpatialNarratorExport | null;
  summaryText: string;
};
