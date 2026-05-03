import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";

export type SpatialCuratedDeckAnchorSummary = {
  schema: "urai.spatial.curated-deck-anchor.v1";
  activeEntryId: string | null;
  totalEntries: number;
  accountAnchorEntryId: string | null;
  sourceAnchorEntryId: string | null;
  accountAnchorDistance: number;
  sourceAnchorDistance: number;
  accountAnchorDiff: SpatialCuratedDeckDiff | null;
  sourceAnchorDiff: SpatialCuratedDeckDiff | null;
  summaryText: string;
};
