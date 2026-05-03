export type SpatialCuratedDeckDivergenceSummary = {
  schema: "urai.spatial.curated-deck-divergence.v1";
  activeEntryId: string | null;
  totalEntries: number;
  cohortSize: number;
  divergenceScore: number;
  divergenceBand: "aligned" | "offset" | "outlier";
  dominantSource: string | null;
  activeMatchesDominantSource: boolean;
  averageCardCount: number;
  cardCountDeltaFromAverage: number;
  commonFirstCardEntryId: string | null;
  activeMatchesCommonFirstCard: boolean;
  dominantFirstMode: string | null;
  activeMatchesDominantFirstMode: boolean;
  summaryText: string;
};
