import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";

export type SpatialCuratedDeckNeighborDiffSummary = {
  schema: "urai.spatial.curated-deck-neighbor-diff.v1";
  activeEntryId: string | null;
  activeIndex: number;
  totalEntries: number;
  previousToActive: SpatialCuratedDeckDiff | null;
  activeToNext: SpatialCuratedDeckDiff | null;
  summaryText: string;
};
