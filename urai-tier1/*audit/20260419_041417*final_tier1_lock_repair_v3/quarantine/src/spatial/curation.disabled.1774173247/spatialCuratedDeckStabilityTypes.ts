
import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";

export type SpatialCuratedDeckStabilitySummary = {
  schema: "urai.spatial.curated-deck-stability.v1";
  activeEntryId: string | null;
  totalEntries: number;
  stabilityScore: number;
  stabilityBand: "stable" | "watch" | "volatile";
  comparedSides: number;
  previousDiff: SpatialCuratedDeckDiff | null;
  nextDiff: SpatialCuratedDeckDiff | null;
  sourceChangedCount: number;
  firstCardChangedCount: number;
  sceneModeShiftTotal: number;
  selectedStarShiftTotal: number;
  cardDeltaMagnitude: number;
  summaryText: string;
};
